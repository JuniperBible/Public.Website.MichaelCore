import { EmailMessage } from "cloudflare:email";

// Structured logging helper
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

// Error messages - can be overridden via environment variables
const getErrorMessages = (env) => ({
  methodNotAllowed: env.ERROR_METHOD_NOT_ALLOWED || 'Method not allowed',
  serverMisconfigured: env.ERROR_SERVER_MISCONFIGURED || 'Server misconfigured',
  missingAuth: env.ERROR_MISSING_AUTH || 'Missing authentication',
  requestExpired: env.ERROR_REQUEST_EXPIRED || 'Request expired',
  invalidSignature: env.ERROR_INVALID_SIGNATURE || 'Invalid signature',
  missingFields: env.ERROR_MISSING_FIELDS || 'Missing required fields'
});

/**
 * Verify HMAC-SHA256 signature for request authentication.
 * @param {string} payload - The signed payload (timestamp.body)
 * @param {string} signature - Base64-encoded HMAC signature
 * @param {string} secret - Shared secret key
 * @returns {Promise<boolean>} True if signature is valid
 */
async function verifyHMAC(payload, signature, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  const payloadBytes = encoder.encode(payload);

  return await crypto.subtle.verify("HMAC", key, signatureBytes, payloadBytes);
}

export default {
  /**
   * Handle incoming requests to send emails via Cloudflare Email Routing.
   * Validates HMAC signature, checks replay protection, and sends email.
   * @param {Request} request - The incoming HTTP request
   * @param {Object} env - Environment bindings (EMAIL, secrets)
   * @returns {Promise<Response>} JSON response with success or error
   */
  async fetch(request, env) {
    const errors = getErrorMessages(env);

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: errors.methodNotAllowed }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      // Verify shared secret via HMAC
      const signature = request.headers.get("X-Signature");
      const timestamp = request.headers.get("X-Timestamp");

      // Use CAPTCHA secret for HMAC (same secret used by Pages Function)
      const authSecret = env.TURNSTILE_SECRET_KEY ||
                         env.RECAPTCHA_SECRET_KEY ||
                         env.HCAPTCHA_SECRET_KEY ||
                         env.FRIENDLY_CAPTCHA_SECRET_KEY;

      if (!authSecret) {
        log('error', 'No CAPTCHA secret configured for HMAC auth');
        return new Response(JSON.stringify({ error: errors.serverMisconfigured }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!signature || !timestamp) {
        return new Response(JSON.stringify({ error: errors.missingAuth }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Reject requests older than 2 minutes (replay protection)
      const requestTime = parseInt(timestamp, 10);
      const now = Date.now();
      if (isNaN(requestTime) || Math.abs(now - requestTime) > 2 * 60 * 1000) {
        return new Response(JSON.stringify({ error: errors.requestExpired }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      const requestBody = await request.text();
      const payload = `${timestamp}.${requestBody}`;

      const isValid = await verifyHMAC(payload, signature, authSecret);
      if (!isValid) {
        return new Response(JSON.stringify({ error: errors.invalidSignature }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      const data = JSON.parse(requestBody);
      const { name, email, subject, body: emailBody } = data;

      if (!name || !email || !subject || !emailBody) {
        return new Response(JSON.stringify({ error: errors.missingFields }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Email configuration from environment variables
      const emailDomain = env.EMAIL_DOMAIN || "focuswithjustin.com";
      const emailFrom = env.EMAIL_FROM || "noreply@focuswithjustin.com";
      const emailTo = env.EMAIL_TO || "jmw@focuswithjustin.com";
      const senderName = env.EMAIL_SENDER_NAME || "Contact Form";

      const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${emailDomain}>`;

      const rawEmail = [
        `From: "${senderName}" <${emailFrom}>`,
        `To: ${emailTo}`,
        `Reply-To: "${name}" <${email}>`,
        `Subject: ${subject}`,
        `Message-ID: ${messageId}`,
        `Date: ${new Date().toUTCString()}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        emailBody
      ].join("\r\n");

      const emailMessage = new EmailMessage(
        emailFrom,
        emailTo,
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(rawEmail));
            controller.close();
          }
        })
      );

      await env.EMAIL.send(emailMessage);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      log('error', 'Email error', { error: error.message });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
