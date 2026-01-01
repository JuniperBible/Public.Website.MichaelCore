# Third-Party Licenses

This project incorporates code and interface patterns from third-party projects.
This file provides proper attribution as required by their respective licenses.

---

## STEPBible Interface Patterns

**Project:** STEPBible
**Source:** https://github.com/STEPBible/step
**License:** BSD 3-Clause License

The parallel translation view interface and comparison patterns in this project
are inspired by and adapted from STEPBible's comparison interface.

### BSD 3-Clause License

```
Copyright (c) 2012, STEPBible
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Files Using STEPBible Patterns

- `themes/airfold/assets/js/parallel.js` - Parallel translation view controller
- `layouts/religion/compare.html` - Compare page layout
- `themes/airfold/extensions/religion/layouts/partials/translation-selector.html` - Translation selector

---

## Hammer.js

**Project:** Hammer.js
**Source:** https://hammerjs.github.io/
**License:** MIT License

Used for touch gesture support (pinch-to-zoom, rotate) in the lightbox component.

---

## OpenPGP.js

**Project:** OpenPGP.js
**Source:** https://openpgpjs.org/
**License:** LGPL-3.0

Used for client-side PGP encryption in the contact form.

---

## Mermaid

**Project:** Mermaid
**Source:** https://mermaid.js.org/
**License:** MIT License

Used for diagram rendering in documentation and articles.

---

## Tailwind CSS

**Project:** Tailwind CSS
**Source:** https://tailwindcss.com/
**License:** MIT License

CSS framework used for styling.

---

## SWORD Project

**Project:** The SWORD Project
**Source:** https://www.crosswire.org/sword/
**License:** GPL-2.0

Bible text data is extracted from SWORD modules. The extraction tool
(`tools/juniper/`) is separate from the website code.

---

For the complete list of npm package licenses, run:
```bash
npx license-checker --summary
```
