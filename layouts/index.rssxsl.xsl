<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html>
<head>
  <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    @font-face {
      font-family: 'Neucha';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('/fonts/neucha.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Patrick Hand';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('/fonts/patrickhand.woff2') format('woff2');
    }
    :root {
      --paper-white: #b5a48e;
      --paper-bright: #e6ddc0;
      --paper-brown: #4a4a4a;
      --paper-cream: #f5f1e8;
      --paper-black: #2c2416;
      --paper-gray: #5c5347;
      --accent: #7a00b0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Neucha', cursive;
      background-color: var(--paper-white);
      color: var(--paper-black);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .container {
      max-width: 56rem;
      margin: 0 auto;
      padding: 2rem 1rem;
      flex-grow: 1;
    }
    footer {
      border-top: 2px solid var(--paper-black);
      background: var(--paper-brown);
      color: var(--paper-cream);
      padding: 1.5rem 1rem;
      margin-top: auto;
    }
    .footer-inner {
      max-width: 56rem;
      margin: 0 auto;
      text-align: center;
    }
    .footer-nav {
      font-size: 1.25rem;
      color: var(--paper-cream);
    }
    .footer-nav a {
      color: var(--paper-cream);
      text-decoration: none;
    }
    .footer-nav a:hover {
      color: white;
      text-decoration: underline;
      text-decoration-color: var(--accent);
      text-decoration-style: wavy;
    }
    .footer-nav a.active {
      text-decoration: none;
      background-image: linear-gradient(90deg, var(--accent) 0%, var(--accent) 100%);
      background-repeat: no-repeat;
      background-position: 0 90%;
      background-size: 100% 2px;
    }
    .footer-social {
      font-size: 0.875rem;
      color: var(--paper-cream);
      margin-top: 0.5rem;
    }
    .footer-social a {
      color: var(--paper-cream);
      text-decoration: none;
    }
    .footer-social a:hover {
      color: white;
      text-decoration: underline;
      text-decoration-color: var(--accent);
      text-decoration-style: wavy;
    }
    .footer-disclaimer {
      font-size: 0.875rem;
      color: var(--paper-cream);
      margin-top: 0.5rem;
    }
    .footer-disclaimer a {
      color: var(--paper-cream);
    }
    .footer-disclaimer a:hover {
      color: white;
    }
    h1 {
      font-family: 'Patrick Hand', cursive;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      border-bottom: 3px solid var(--paper-black);
      padding-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--paper-gray);
      margin-bottom: 1rem;
    }
    .feed-info {
      background: rgba(122, 0, 176, 0.1);
      border: 2px solid var(--accent);
      border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
      padding: 1rem;
      margin-bottom: 2rem;
    }
    .feed-info p {
      margin-bottom: 0.5rem;
    }
    .feed-url {
      font-family: monospace;
      background: var(--paper-white);
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      word-break: break-all;
      display: block;
      margin-top: 0.5rem;
    }
    .articles {
      list-style: none;
    }
    .article {
      border-bottom: 1px solid #ddd;
      padding: 1.5rem 0;
    }
    .article:last-child {
      border-bottom: none;
    }
    .article-title {
      font-family: 'Patrick Hand', cursive;
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    .article-title a {
      color: var(--paper-black);
      text-decoration: none;
    }
    .article-title a:hover {
      color: var(--accent);
      text-decoration: underline;
    }
    .article-meta {
      color: var(--paper-gray);
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
    .article-description {
      color: var(--paper-black);
    }
    .back-link {
      display: inline-block;
      margin-bottom: 1rem;
      color: var(--accent);
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .count {
      background: var(--accent);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
      font-size: 0.9rem;
      margin-left: 0.5rem;
    }
    @media (max-width: 600px) {
      h1 { font-size: 1.75rem; }
      .article-title { font-size: 1.25rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">← Back to site</a>
    <h1>RSS Feed <span class="count"><xsl:value-of select="count(/rss/channel/item)"/> articles</span></h1>
    <p class="subtitle"><xsl:value-of select="/rss/channel/description"/></p>

    <div class="feed-info">
      <p><strong>This is an RSS feed.</strong> Subscribe by copying the URL into your feed reader.</p>
      <code class="feed-url"><xsl:value-of select="/rss/channel/atom:link[@rel='self']/@href"/></code>
    </div>

    <ul class="articles">
      <xsl:for-each select="/rss/channel/item">
        <li class="article">
          <h2 class="article-title">
            <a href="{link}"><xsl:value-of select="title"/></a>
          </h2>
          <p class="article-meta">
            <xsl:value-of select="substring(pubDate, 5, 12)"/>
          </p>
          <p class="article-description">
            <xsl:value-of select="substring(description, 1, 300)" disable-output-escaping="no"/>
            <xsl:if test="string-length(description) > 300">...</xsl:if>
          </p>
        </li>
      </xsl:for-each>
    </ul>
  </div>

  <footer>
    <div class="footer-inner">
      <nav class="footer-nav">
        {{- range .Site.Menus.main }}
        <a href="{{ .URL }}">{{ .Name }}</a> |
        {{- end }}
        <a href="/privacy/">Privacy</a> |
        <a href="/terms/">Terms</a> |
        <a href="/tags/">Tags</a> |
        <a href="/sitemap.xml">Sitemap</a> |
        <a href="/feed.xml" class="active">RSS</a>
      </nav>
      <nav class="footer-social">
        {{- range $i, $link := .Site.Data.social.links -}}
        {{- if $i }} | {{ end -}}
        <a href="{{ $link.url }}" target="_blank" rel="noopener">{{ $link.name }}</a>
        {{- end }}
      </nav>
      <p class="footer-disclaimer">
        {{- $currentYear := now.Year -}}
        {{- $startYear := .Site.Params.copyrightStartYear | default $currentYear -}}
        {{- $yearRange := cond (eq $startYear $currentYear) (printf "%d" $currentYear) (printf "%d-%d" $startYear $currentYear) -}}
        © {{ $yearRange }} {{ with .Site.Params.footerText }}{{ . | safeHTML }}{{ else }}{{ $.Site.Params.author.name }}. All rights reserved.{{ end }}
      </p>
    </div>
  </footer>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
