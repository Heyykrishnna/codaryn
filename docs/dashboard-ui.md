# Dashboard interface

Overview, Studio, Quality, Execution, Schema, Graph, Comparisons, and Repositories share the same navigation, page width, heading, and workspace picker. The picker carries a selection across dashboard routes for the current account. A Graph deep link can specify a different workspace; the picker checks that workspace against the memberships returned by the API.

Use solid neutral surfaces, dotted dividers, and plain-text statuses. Keep colors and motion in Tailwind utilities. Use the shared loading indicator while a request is pending, then show its result, an actionable empty state, or an error. Motion respects the operating system’s reduced-motion preference.

The shared Candy Button adapts [DevClub UI’s Candy Button](https://ui.devclubxnst.com/components/candy-button) to solid fills. Its small bottom shadow and press offset give primary actions tactile feedback. The searchable workspace picker and repository filters are maintained in Codaryn. Use Tab or the arrow keys to move through choices, Enter or Space to choose, and Escape to dismiss.

Overview uses workspace totals from the team overview API. Studio and Graph show repository configuration and analysis evidence; they do not substitute demonstration data for missing artifacts.

## Third-party notice

The Candy Button is adapted from [DevClub UI](https://github.com/devclub-nstru/component_library), distributed under the [MIT License](https://github.com/devclub-nstru/component_library/blob/main/LICENSE).

Copyright (c) 2026 DevClub (devclubnst / dev-club-components)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
