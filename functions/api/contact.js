// =============================================================================
// Configuration
// =============================================================================

// Module-level TextEncoder instance (reused across requests)
const TEXT_ENCODER = new TextEncoder();

const CONFIG = {
  // Rate limiting
  RATE_LIMIT: {
    maxRequests: 5,       // Maximum requests per window
    windowSeconds: 3600   // 1 hour window (3600 seconds)
  },
  // Input validation limits
  INPUT_LIMITS: {
    name: 200,
    email: 254,           // RFC 5321 max email length
    subject: 500,
    message: 5000
  },
  // Cache key prefix for rate limiting
  CACHE_KEY_PREFIX: 'https://rate-limit.internal/'
};

// =============================================================================
// Logging
// =============================================================================

function log(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// =============================================================================
// Rate Limiting
// =============================================================================

async function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const cacheKey = new Request(`${CONFIG.CACHE_KEY_PREFIX}${ip}`, { method: 'GET' });
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  let count = 0;

  if (cached) {
    const parsed = parseInt(await cached.text(), 10);
    count = isNaN(parsed) ? 0 : parsed;
  }

  if (count >= CONFIG.RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, ip };
  }

  // Increment count and store in cache
  const newCount = count + 1;
  const response = new Response(newCount.toString(), {
    headers: {
      'Cache-Control': `max-age=${CONFIG.RATE_LIMIT.windowSeconds}`,
      'Content-Type': 'text/plain'
    }
  });
  await cache.put(cacheKey, response);

  return { allowed: true, remaining: CONFIG.RATE_LIMIT.maxRequests - newCount, ip };
}

// CAPTCHA secret environment variable keys (used for auth and verification)
const CAPTCHA_SECRET_KEYS = [
  'TURNSTILE_SECRET_KEY',
  'RECAPTCHA_SECRET_KEY',
  'HCAPTCHA_SECRET_KEY',
  'FRIENDLY_CAPTCHA_SECRET_KEY'
];

// Get the first configured CAPTCHA secret from environment
function getAuthSecret(env) {
  for (const key of CAPTCHA_SECRET_KEYS) {
    if (env[key]) return env[key];
  }
  return null;
}

// Check if any CAPTCHA secret is configured
function hasAnyCaptchaSecret(env) {
  return CAPTCHA_SECRET_KEYS.some(key => env[key]);
}

// CAPTCHA provider configurations
const captchaProviders = {
  turnstile: {
    url: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    name: 'Turnstile',
    envKey: 'TURNSTILE_SECRET_KEY',
    contentType: 'form',
    tokenField: 'cf-turnstile-response'
  },
  recaptcha: {
    url: 'https://www.google.com/recaptcha/api/siteverify',
    name: 'reCAPTCHA',
    envKey: 'RECAPTCHA_SECRET_KEY',
    contentType: 'form',
    tokenField: 'g-recaptcha-response',
    checkScore: true
  },
  hcaptcha: {
    url: 'https://hcaptcha.com/siteverify',
    name: 'hCaptcha',
    envKey: 'HCAPTCHA_SECRET_KEY',
    contentType: 'form',
    tokenField: 'h-captcha-response'
  },
  'friendly-captcha': {
    url: 'https://api.friendlycaptcha.com/api/v1/siteverify',
    name: 'Friendly Captcha',
    envKey: 'FRIENDLY_CAPTCHA_SECRET_KEY',
    contentType: 'json',
    tokenField: 'frc-captcha-solution',
    bodyFormat: 'solution'
  }
};

// Generic CAPTCHA verification function
async function verifyCaptcha(provider, token, secretKey, clientIP) {
  const config = captchaProviders[provider] || captchaProviders[provider.replace('-v2', '').replace('-v3', '')];
  if (!config) return { success: false, provider: 'unknown', result: { error: 'Unknown provider' } };

  const isJson = config.contentType === 'json';
  const body = isJson
    ? JSON.stringify({ [config.bodyFormat || 'response']: token, secret: secretKey })
    : new URLSearchParams({ secret: secretKey, response: token, remoteip: clientIP });

  const response = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': isJson ? 'application/json' : 'application/x-www-form-urlencoded' },
    body
  });

  const result = await response.json();
  const success = config.checkScore
    ? result.success && (result.score === undefined || result.score >= 0.5)
    : result.success;

  return { success, provider: config.name, result };
}

// Get CAPTCHA token from form data based on provider
function getCaptchaToken(formData) {
  for (const [key, config] of Object.entries(captchaProviders)) {
    const token = formData.get(config.tokenField);
    if (token) {
      return { token, field: config.tokenField, provider: key };
    }
  }
  return { token: null, field: null, provider: null };
}

// Get provider config, handling v2/v3 variants
function getProviderConfig(provider) {
  return captchaProviders[provider] || captchaProviders[provider?.replace('-v2', '').replace('-v3', '')];
}

// Determine secret key for a provider (env takes precedence over form)
function getSecretKey(provider, formSecret, env) {
  const config = getProviderConfig(provider);
  if (!config) return null;
  return env[config.envKey] || formSecret;
}

// Check if CAPTCHA is enabled (provider specified in form or env keys present)
function isCaptchaEnabled(formData, env) {
  const provider = formData.get('captcha_provider');
  const formSecret = formData.get('captcha_secret');

  if (provider && provider !== 'disabled') {
    return !!getSecretKey(provider, formSecret, env);
  }

  return hasAnyCaptchaSecret(env);
}

// Email format validation (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sanitize text for email body (prevent header injection)
function sanitizeForEmail(text) {
  return text
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\r/g, '\n')     // Convert remaining CR to LF
    .replace(/\n\./g, '\n..'); // Escape dot at line start (SMTP)
}

// Allowed origins for CORS/CSRF protection
const ALLOWED_ORIGINS = [
  'https://focuswithjustin.com',
  'https://www.focuswithjustin.com'
];

// Validate input lengths
function validateInputLengths(fields) {
  for (const [field, value] of Object.entries(fields)) {
    const limit = CONFIG.INPUT_LIMITS[field];
    if (limit && value && value.length > limit) {
      return { valid: false, field, limit };
    }
  }
  return { valid: true };
}

// Validate request origin
function isValidOrigin(request, env) {
  const origin = request.headers.get('Origin');
  // Allow configured origins or localhost for development
  const allowedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ALLOWED_ORIGINS;

  // Allow requests with no origin (same-origin form submissions)
  if (!origin) return true;

  return allowedOrigins.some(allowed =>
    origin === allowed || origin.startsWith('http://localhost')
  );
}

// Error messages - can be overridden via environment variables
const getErrorMessages = (env) => ({
  allFieldsRequired: env.ERROR_ALL_FIELDS_REQUIRED || 'All fields are required',
  invalidEmail: env.ERROR_INVALID_EMAIL || 'Invalid email format',
  inputTooLong: env.ERROR_INPUT_TOO_LONG || 'Input too long',
  invalidOrigin: env.ERROR_INVALID_ORIGIN || 'Invalid request origin',
  rateLimited: env.ERROR_RATE_LIMITED || 'Too many requests. Please try again later.',
  captchaRequired: env.ERROR_CAPTCHA_REQUIRED || 'CAPTCHA verification required',
  captchaConfigError: env.ERROR_CAPTCHA_CONFIG || 'CAPTCHA configuration error',
  captchaFailed: env.ERROR_CAPTCHA_FAILED || 'CAPTCHA verification failed',
  serverConfigError: env.ERROR_SERVER_CONFIG || 'Server configuration error',
  failedToSend: env.ERROR_FAILED_TO_SEND || 'Failed to send email'
});

// Email configuration
const getEmailConfig = (env) => ({
  subjectPrefix: env.EMAIL_SUBJECT_PREFIX || 'Contact Form: ',
  thankYouUrl: env.CONTACT_THANK_YOU_URL || '/contact/thanks/'
});

/**
 * Handle POST requests to the contact form endpoint.
 * Validates input, verifies CAPTCHA, and sends email via worker.
 *
 * @param {Object} context - Cloudflare Pages Function context
 * @param {Request} context.request - The incoming HTTP request
 * @param {Object} context.env - Environment variables and bindings
 * @returns {Response} Redirect on success, JSON error on failure
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  const errors = getErrorMessages(env);
  const emailConfig = getEmailConfig(env);

  // Validate origin to prevent CSRF
  if (!isValidOrigin(request, env)) {
    log('error', 'Invalid origin', { origin: request.headers.get('Origin') });
    return new Response(JSON.stringify({ error: errors.invalidOrigin }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check rate limit
  const rateCheck = await checkRateLimit(request);
  if (!rateCheck.allowed) {
    log('warn', 'Rate limit exceeded', { ip: rateCheck.ip });
    return new Response(JSON.stringify({ error: errors.rateLimited }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': CONFIG.RATE_LIMIT.windowSeconds.toString()
      }
    });
  }

  try {
    const formData = await request.formData();
    const name = formData.get('name')?.trim() || '';
    const email = formData.get('email')?.trim() || '';
    const subject = formData.get('subject')?.trim() || '';
    const message = formData.get('message')?.trim() || '';
    const encryptedMessage = formData.get('encrypted_message');

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: errors.allFieldsRequired }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      log('error', 'Invalid email format', { email: email.substring(0, 50) });
      return new Response(JSON.stringify({ error: errors.invalidEmail }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate input lengths
    const lengthValidation = validateInputLengths({ name, email, subject, message });
    if (!lengthValidation.valid) {
      log('error', 'Input too long', { field: lengthValidation.field, limit: lengthValidation.limit });
      return new Response(JSON.stringify({ error: errors.inputTooLong }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // CAPTCHA verification (if provider is configured)
    const captchaProvider = formData.get('captcha_provider');
    const captchaSecret = formData.get('captcha_secret');

    if (isCaptchaEnabled(formData, env)) {
      const { token, provider: detectedProvider } = getCaptchaToken(formData);

      if (!token) {
        return new Response(JSON.stringify({ error: errors.captchaRequired }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Use provider from form if available, otherwise use detected provider
      const provider = captchaProvider || detectedProvider;
      const secretKey = getSecretKey(provider, captchaSecret, env);

      if (!secretKey) {
        log('error', 'No CAPTCHA secret found', { provider });
        return new Response(JSON.stringify({ error: errors.captchaConfigError }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const clientIP = request.headers.get('CF-Connecting-IP') || '';
      const verification = await verifyCaptcha(provider, token, secretKey, clientIP);

      log('info', 'CAPTCHA verification', { provider: verification.provider, success: verification.success });

      if (!verification.success) {
        return new Response(JSON.stringify({ error: errors.captchaFailed }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Sanitize user input for email body
    const safeName = sanitizeForEmail(name);
    const safeSubject = sanitizeForEmail(subject);
    const safeMessage = sanitizeForEmail(message);

    const emailBody = encryptedMessage
      ? `New contact form submission:\n\nName: ${safeName}\nEmail: ${email}\nSubject: ${safeSubject}\n\n--- Encrypted Message ---\n${encryptedMessage}`
      : `New contact form submission:\n\nName: ${safeName}\nEmail: ${email}\nSubject: ${safeSubject}\n\nMessage:\n${safeMessage}`;

    // Get CAPTCHA secret for HMAC signing
    const authSecret = getAuthSecret(env);
    if (!authSecret) {
      log('error', 'No CAPTCHA secret for worker auth');
      return new Response(JSON.stringify({ error: errors.serverConfigError }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Sign the request with HMAC
    const timestamp = Date.now().toString();
    const requestBody = JSON.stringify({
      name: name,
      email: email,
      subject: `${emailConfig.subjectPrefix}${subject}`,
      body: emailBody
    });
    const payload = `${timestamp}.${requestBody}`;

    const key = await crypto.subtle.importKey(
      'raw',
      TEXT_ENCODER.encode(authSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, TEXT_ENCODER.encode(payload));
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    // Call email worker via service binding
    const response = await env.EMAIL_WORKER.fetch(new Request('https://email/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Signature': signature
      },
      body: requestBody
    }));

    const responseText = await response.text();
    log('info', 'Email worker response', { status: response.status });

    if (response.ok) {
      log('info', 'Contact form submitted successfully');
      return Response.redirect(new URL(emailConfig.thankYouUrl, request.url).toString(), 303);
    } else {
      log('error', 'Email worker error', { status: response.status, response: responseText });
      return new Response(JSON.stringify({ error: errors.failedToSend }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    log('error', 'Contact form error', { error: error.message });
    return new Response(JSON.stringify({ error: errors.failedToSend }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
