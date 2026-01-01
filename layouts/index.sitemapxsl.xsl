<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html>
<head>
  <title>Sitemap - {{ .Site.Title }}</title>
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
      margin-bottom: 2rem;
    }
    .count {
      background: var(--accent);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
      font-size: 0.9rem;
      margin-left: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    th {
      font-family: 'Patrick Hand', cursive;
      text-align: left;
      padding: 0.75rem;
      border-bottom: 2px solid var(--paper-black);
      background: var(--paper-white);
    }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid #ddd;
    }
    tr:hover td {
      background: rgba(122, 0, 176, 0.1);
    }
    a {
      color: var(--paper-black);
      text-decoration: none;
    }
    a:hover {
      color: var(--accent);
      text-decoration: underline;
    }
    .date {
      color: var(--paper-gray);
      font-size: 0.9rem;
      white-space: nowrap;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 1rem;
      color: var(--accent);
    }
    @media (max-width: 600px) {
      h1 { font-size: 1.75rem; }
      .hide-mobile { display: none; }
      td, th { padding: 0.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">← Back to site</a>
    <h1>Sitemap <span class="count"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> pages</span></h1>
    <p class="subtitle">All pages on {{ .Site.Title }}</p>
    <table>
      <thead>
        <tr>
          <th>URL</th>
          <th class="hide-mobile">Last Modified</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="sitemap:urlset/sitemap:url">
          <tr>
            <td>
              <a href="{sitemap:loc}">
                <xsl:value-of select="sitemap:loc"/>
              </a>
            </td>
            <td class="date hide-mobile">
              <xsl:if test="sitemap:lastmod">
                <xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/>
              </xsl:if>
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
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
        <a href="/sitemap.xml" class="active">Sitemap</a> |
        <a href="/feed.xml">RSS</a>
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
