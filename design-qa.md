# SpritePixel Homepage Design QA

## Comparison Target

- Source visual truth: `docs/demo.png`
- Rendered implementation: `docs/implementation-homepage.png`
- Mobile homepage: `docs/implementation-homepage-mobile.png`
- Mobile navigation: `docs/implementation-mobile-menu.png`
- Simplified Chinese homepage: `docs/implementation-homepage-zh.png`
- Full-view comparison: `docs/design-qa-full-comparison.png`
- Focused above-the-fold comparison: `docs/design-qa-comparison.png`
- State: English, dark theme, signed out, initial homepage state
- Desktop CSS viewport: `1440 × 1000`, device scale factor `1`
- Responsive check: `390 × 844`, device scale factor `1`

## Density Normalization

- Source image: `3024 × 13340` pixels. It behaves like an approximately 2x desktop capture, so the full source was normalized to `1440` pixels wide for composition review.
- Current implementation fold: `1440 × 1000` pixels captured directly from the in-app browser at a `1440` CSS-pixel viewport.
- Focused comparison: source crop `3024 × 2100` was uniformly normalized to `1440 × 1000`; implementation viewport capture was `1440 × 1000`.
- The implementation is intentionally longer than the source because the product document requires separate Sprite, Animation, Batch Icons, Project Style, Vault, Use Cases, Free Tools, Pricing and FAQ modules.

## Required Fidelity Surfaces

- Fonts and typography: Space Grotesk is used for display headings, Inter for body/UI, and JetBrains Mono for workshop labels. The hero hierarchy, tight display tracking and small technical labels follow the reference. One visible H1 remains after the accessibility/SEO fix.
- Spacing and layout rhythm: the desktop uses a wide two-column hero, large editorial section spacing and hard-edged product panels. Mobile collapses to one column with no horizontal overflow. All visible surfaces use zero radius and flat borders.
- Colors and visual tokens: the navy workshop background, steel borders, cyan interaction state and green readiness state match the source language. Forge Gold is intentionally used for primary actions because the product document defines Gold as the brand/primary-action color and Cyan as interaction/selection.
- Image quality and asset fidelity: the user explicitly requested placeholders for image-dependent areas. Product panels therefore use clearly labeled, consistent asset placeholders and Tabler icons rather than pretending to show finished game art. These slots are ready for later original assets.
- Copy and content: homepage copy follows the V1.2 product document, including project-first positioning, batch generation, consistency, commercial-use qualification, pricing and the seven MVP FAQs. English and Simplified Chinese are semantically aligned.

## Full-View Comparison Evidence

The combined full-page image confirms the same overall design language: dark game-workshop canvas, narrow technical labels, large display headlines, rectangular editor panels, sparse dividers, compact pricing cards and a restrained final CTA. The added page length is a product-scope difference, not visual drift.

## Focused Region Evidence

The combined first-fold image confirms comparable navigation density, hero/editor split, headline hierarchy and panel framing. The implementation deliberately adds the product-document prompt input and uses Gold for the primary CTA; both are explicit SpritePixel product requirements.

## Comparison History

### Iteration 1

- P1: two H1 elements were present because the dynamic page wrapper added a screen-reader title in addition to the visible hero H1.
- P2: browser-language detection inserted an unrelated banner above the reference-style navigation on first visit.
- P2: the original hero column ratio forced the desktop title into four lines and reduced the product preview width.
- Fixes: removed the redundant localized page title field, disabled automatic locale-detection UI by default, widened the hero copy column and reduced the display size.

### Iteration 2

- Post-fix evidence: desktop DOM reports exactly one H1, `1440px` body width at a `1440px` viewport, a `1000px` hero height and no locale banner.
- Post-fix evidence: `390 × 844` mobile layout reports no horizontal overflow; the mobile menu changes between `inactive` and `active`; prompt submission reaches `/sign-up` with the prompt preserved inside the dashboard callback URL.
- Console: no browser console errors on the final homepage load.

### Iteration 3

- P1: the shared header still relied on inherited theme colors, so navigation text could become black or lose contrast in a different theme/scroll state.
- P2: the mobile action row allowed the sign-in button to be clipped at the right edge at `390px`.
- Fixes: pinned the header, desktop navigation, scroll state and mobile navigation to the SpritePixel navy/white/cyan tokens; allowed mobile actions to wrap; removed the spacer and redundant sign-in margin that caused clipping.
- Post-fix evidence: desktop navigation resolves to `rgb(203, 213, 225)` on `#0B1020` at the first fold and after scrolling; the mobile menu resolves to white links on the navy surface, shows Create Project, language and Sign In entirely inside the viewport, and reports zero horizontal overflow.
- Post-fix evidence: the Simplified Chinese page has one H1, the correct `lang="zh"`, readable navigation and zero horizontal overflow.
- Console and build: no browser console warnings/errors on the final English or Chinese homepage; the production build completes all 23 static pages.
- Result: no actionable P0, P1 or P2 design findings remain.

### Iteration 4

- Requested palette update: the page and navigation canvas now resolve to `rgb(15, 21, 38)` (`#0F1526`), while the promise strip, icon-set section, pricing section and final CTA use `rgb(11, 16, 32)` (`#0b1020`) for restrained depth.
- Requested shape update: the shared button component, native buttons and button-role controls resolve to `0px` corner radius. Header, hero, generator, pricing and final CTA actions were checked at desktop and mobile widths.
- Requested hierarchy update: reusable section headers now render an explicit badge row followed by H2 and description. Browser geometry confirms increasing vertical positions and `flex-direction: column` for English, Simplified Chinese and mobile layouts.
- Responsive evidence: desktop `1440 × 1000` and mobile `390 × 844` both report one H1 and zero horizontal overflow. The mobile navigation keeps all actions visible and square.
- Visual comparison: the refreshed focused comparison preserves the reference's dark game-workshop language while intentionally shifting the implementation to the requested lighter blue-black canvas.
- Result: no actionable P0, P1 or P2 design findings remain after the requested refinements.

### Iteration 5

- P1: the footer brand, column labels and language selector relied on inherited theme color, which could render dark text over the fixed dark footer surface.
- P2: footer links used Primary Gold for hover while the header used hard-coded Cyan and Steel Blue values, so interaction semantics were inconsistent.
- Fixes: made the default theme explicitly dark, pinned critical footer labels and controls to Foreground, and replaced header/footer interaction colors with the shared Accent and Accent Foreground tokens.
- Token contract: Primary is reserved for conversion actions; Secondary for quiet filled surfaces; Accent for hover/focus/selected navigation; Foreground and Muted for text hierarchy; Border and Ring for structure and focus visibility.
- Post-fix evidence: the footer resolves to `#0b1020`, all highlighted footer headings and the locale control resolve to `#f8fafc`, supporting links resolve to `#7e8ca5`, and header/footer interactive classes both resolve through Accent (`#153044`) and Accent Foreground (`#35c2ff`).
- Comparison: `docs/footer-theme-comparison.png` places the reported screenshot above the corrected local render. The black footer headings, brand title and locale label are no longer present.
- Result: no actionable P0, P1 or P2 design findings remain for the requested theme and navigation surfaces.

### Iteration 6

- Hero concept: replaced the static gameplay placeholder with a generated raccoon adventurer and an approximately 7.8-second Canvas + Sprite Sheet product loop.
- Product story: the loop now moves through Project Context, Batch Generate, Play Test and Save to Vault, with four matching generated assets and a generated training dummy.
- Asset delivery: production Canvas files use lossless transparent WebP versions of the 4 × 8 raccoon action sheet, four-item project asset strip and training dummy. Pixel rendering disables image smoothing and caps device pixel ratio at 2.
- Runtime behavior: the animation stops rendering when offscreen or when the document is hidden, restarts on return, and presents the completed Vault state when reduced motion is requested. Asset failures render an explicit retry message.
- Visual evidence: desktop browser checks covered the context, batch generation, attack test and saved Vault states. The generated sprites remain clear inside the existing rectangular Forge panel without crop or overflow.
- Console and code: browser logs contain only development Fast Refresh messages; targeted TypeScript and diff checks pass.
- Result: no actionable P0, P1 or P2 findings remain for the raccoon Hero animation.

## Follow-up Polish

- P3: refine or replace the generated draft logo when the final SpritePixel identity system is approved.
- P3: replace labeled game-art slots with original gameplay footage and generated sprite/icon assets while keeping the current panel dimensions and crop rules.

## Hero Composer and Video Refresh (2026-09-10)

- Source visual truth: `/Users/miracle/Downloads/sprite-vault.png` for the prompt composer structure, plus `/var/folders/x4/5nzfn0y57dvbgdw6wsz3f2cr0000gn/T/codex-clipboard-03dcc101-0298-449d-8f64-d8c5ec714d23.png` for the original homepage Hero and removal target.
- Rendered implementation: Codex in-app browser live captures from `/` and `/zh` in the current QA turn. The capture API did not expose a persistent screenshot path.
- Viewports and density: desktop `1280 × 720` CSS pixels at device scale factor `1`; responsive `390 × 844` CSS pixels at device scale factor `1`. Source images are `686 × 443` and `3008 × 1450` pixels respectively.
- State: signed out, dark theme, Hero initial state; responsive capture also checked after applying the localized Surprise Me prompt.
- Full-view comparison evidence: the former two-column Hero is now a centered single-column composition. The right Forge preview is absent, while the title, description, project-context row and prompt composer share one visual center line over the supplied video.
- Focused comparison evidence: the composer reproduces the reference hierarchy of project context, dashed add-reference control, Surprise Me action, large prompt area, attachment status and bottom-right submit action. It intentionally keeps SpritePixel's established square corners, Gold conversion action and navy workshop surfaces.
- Typography: the existing Space Grotesk, Inter and JetBrains Mono hierarchy remains intact; desktop and mobile keep one H1 with readable wrapping.
- Spacing and layout: desktop composer width is `860px` with a measured center delta of `0px`; mobile document width equals the `390px` viewport with no horizontal overflow.
- Colors and tokens: the prompt surface stays within the existing navy/card/border tokens. A `70%` black overlay keeps the racing video subordinate to the foreground copy and controls.
- Image quality: the supplied `1280 × 720`, 60fps MP4 renders with `object-cover`; browser evidence reports `readyState: 4`, `paused: false`, muted autoplay and looping enabled.
- Copy and content: English and Simplified Chinese project, upload, Surprise Me and submit labels are present. The random prompt is localized in both languages.
- Interaction evidence: Surprise Me populated the textarea; submit navigated to the localized sign-up route with the prompt preserved inside `callbackUrl`; no browser console warnings or errors were reported.

### Comparison History

- Initial implementation: removed the Forge preview, centered the Hero and introduced the reference composer plus video background.
- QA pass: desktop and mobile captures showed no P0/P1/P2 mismatch. No corrective visual iteration was required.
- Residual P3: the moving background necessarily changes the exact source crop over time; this is expected for the requested video treatment and does not affect readability.

## Final Result

final result: passed

## Homepage Reference-image and Tabbed Composer Refresh (2026-09-12)

- Source visual truth: `/Users/miracle/Downloads/ChatGPT Image 2026年9月12日 18_38_56.png` (`1672 × 941` pixels), with the user's four written overrides treated as the acceptance contract.
- Background asset: `public/imgs/bg/index.webp` (`1672 × 941` pixels).
- Rendered implementation: Codex in-app browser captures from `/zh`; the capture API did not expose a persistent screenshot path.
- Viewports: desktop `1672 × 941` CSS pixels and responsive `390 × 844` CSS pixels at device scale factor `1`.
- State: Simplified Chinese, dark theme, signed out; both Create Character and Generate Motion tabs were captured.
- Full-view comparison evidence: the Hero keeps the reference's centered badge, two-tone display headline, centered supporting copy, landscape background and wide bottom composer. The user-requested removal of the badge wheat marks and auxiliary text leaves the hierarchy cleaner without changing the reference composition.
- Focused-region evidence: the tab strip has no surrounding outer frame; the gold structural border begins on the content panel below it. Each panel includes a project row with Add Project, a square upload control, a description field, configuration controls, a primary action directly below the description controls and a square icon-based empty preview.
- Typography: the existing display/body/mono font hierarchy remains readable against the image. Desktop preserves the two-line title; mobile wraps without clipping.
- Spacing and layout: desktop uses the existing `1216px` shell and a three-column composer. The `390px` responsive view reports a `390px` document width with no horizontal overflow and stacks upload, form and preview controls.
- Colors and tokens: the supplied background is darkened with a `65%` blue-black overlay; Gold remains the badge, active-tab, panel-border and primary-action color while supporting surfaces stay within the existing navy token family.
- Image quality: the supplied WebP is used directly with `background-size: cover`; no reconstructed or approximate decorative artwork was introduced. Empty previews use Tabler icons as explicitly requested.
- Copy and content: “上传已有角色……” is absent. Chinese and English labels exist for both tabs, fields, preview states and project actions.
- Interaction evidence: the tabs switch complete form states; Motion preserves its prompt, action, direction, frame count and FPS in the localized registration callback. Add Project reaches the localized sign-up route with `/dashboard` as callback. Browser console reported no warnings or errors during the final interaction pass.

### Comparison History

- Iteration 1: the first rendered desktop state matched the requested visual hierarchy and contained no actionable P0/P1/P2 difference. No visual corrective pass was required.
- Responsive pass: mobile showed no horizontal overflow; the intentionally stacked form is taller than one viewport but all controls remain in normal document flow and reachable by scrolling.

### Findings

- No actionable P0, P1 or P2 findings remain for the requested Hero refresh.
- P3: a generated sprite can replace the current preview icon once the generation service is connected to this homepage form.

## Final Result (2026-09-12)

final result: passed

## Compact Hero Composer and Project Select System (2026-09-12)

- Source visual truth: `/var/folders/x4/5nzfn0y57dvbgdw6wsz3f2cr0000gn/T/codex-clipboard-3e215bcc-6ab5-4758-b6c0-e69444ed00c1.png` for the current density problem and `/var/folders/x4/5nzfn0y57dvbgdw6wsz3f2cr0000gn/T/codex-clipboard-a14f2282-a56b-4007-baf1-040181d7fe0f.png` for the compact inline-option layout.
- Rendered implementation: Codex in-app browser captures from `/zh` and `/`; the capture API did not expose a persistent screenshot path.
- Viewports: desktop browser capture at `1280 × 900` CSS pixels and responsive capture at `390 × 844` CSS pixels.
- Density evidence: Hero tabs measure `44px`; compact option and project Select triggers measure `36px`. The separate project toolbar and detached option rows are removed, reducing the panel to one compact editing surface.
- Layout evidence: character and motion parameters sit at the input's top-left, prompt text remains in the center, the selected project sits at bottom-left, and the primary generation action sits at bottom-right. The result preview remains a square in both desktop and stacked mobile layouts.
- Project evidence: the collapsed control displays one folder icon with `默认项目` / `Default Project`; its styled Radix menu exposes `添加项目` / `Add Project` as the secondary action.
- Select evidence: native user-facing Select markup is absent from `src`; all current product Selects use the shared Radix component with secondary surface, gold focus/open state, rounded popover, highlighted items and selected check icon.
- Interaction evidence: character Style changed to Illustration through the custom menu. Switching to Motion displayed the full default values `攻击 / 向右 / 8 / 8 FPS` and `Attack / Right / 8 / 8 FPS` in Chinese and English.
- Responsive evidence: the `390px` viewport reports a `390px` document width. The option controls wrap two per row without horizontal overflow, while the project menu remains within the viewport and overlays rather than expanding the form.
- Browser evidence: the final English and Chinese interaction passes reported no browser warnings or errors.

### Findings

- No actionable P0, P1 or P2 mismatch remains for the requested density, Select styling or prompt-editor layout.
- P3: pages that intentionally override the shared Select width or radius keep those local layout decisions, while inheriting the new interaction surface and popover styling.

## Final Result (Compact Composer, 2026-09-12)

final result: passed

## Core Asset Workflow QA (2026-09-15)

- Source visual truth: `/var/folders/x4/5nzfn0y57dvbgdw6wsz3f2cr0000gn/T/codex-clipboard-cd0e2ea5-9add-4c81-9ed3-6db5a3585655.png` for the character workspace and `/var/folders/x4/5nzfn0y57dvbgdw6wsz3f2cr0000gn/T/codex-clipboard-355e52d0-ea33-4baf-8f52-fdade21bb958.png` for the animation editor.
- Runtime: a clean production build served through the required `dev-verify` wrapper on port `3100`, backed by a disposable SQLite database under `/private/tmp`. No remote D1 or production account data was changed.
- Viewports and locales: English and Simplified Chinese at the desktop viewport, plus responsive checks at `390 × 844` CSS pixels.
- Project flow evidence: the authenticated dashboard displayed the deterministic Default Project; the shared two-step creation dialog created a project and showed it immediately; the project selector persisted the selection through the authenticated project API and cookie path.
- Character-workspace evidence: the desktop layout contains the project navigation, character list, asset context rail and main canvas from the reference. The implemented workflow exposes only Base Image, Variants, Directions and Animation; Pose, Portrait and Wardrobe controls are intentionally absent. At `390px`, stage controls retain visible localized labels and accessible selected-state semantics.
- Animation-editor evidence: the editor uses a large canvas, bottom frame timeline and right control rail. Playback, FPS, loop, zoom, selection, drag reorder, delete, offsets, undo/redo, unsaved state, save-as-new-version and PNG/ZIP export are present. Pixel brushes, magic cleanup and halo-removal controls are intentionally absent.
- State evidence: saving produced a new non-destructive animation version. Changing FPS marked the editor dirty; undoing back to the loaded baseline cleared the dirty state, disabled Save and enabled Redo.
- Data limitation: the isolated QA records intentionally referenced nonexistent storage objects, so their artwork appeared blank or broken. This was sufficient for layout and state verification but is not evidence of a configured Provider-to-R2 generation run.

### Findings and Fixes

- P1: a newly created project was persisted but did not immediately appear in the current dashboard render. Fixed by refreshing the route after the shared creation callback; the new card then appeared without a manual reload.
- P1: undoing the first editor change back to the loaded baseline left the version marked as unsaved. Fixed by treating the baseline as the first undo target; Save now disables once the baseline is restored.
- P2: compact mobile stage controls used icon-only presentation and did not communicate the complete character workflow. Fixed with visible localized labels, selected-state semantics and responsive wrapping.
- Result: no actionable P0, P1 or P2 finding remains in the implemented UI. A paid Provider/R2 end-to-end run remains a production-readiness check after the three model routes and storage are configured.

## Final Result (Core Asset Workflow, 2026-09-15)

final result: passed with external-service E2E deferred until configuration

## Homepage Project Composer Adjustments (2026-09-15)

- Source visual truth: `/var/folders/x4/5nzfn0y57dvbgdw6wsz3f2cr0000gn/T/codex-clipboard-7f7b12d4-8055-43fa-b818-79bf69ea2bfb.png`, `/var/folders/x4/5nzfn0y57dvbgdw6wsz3f2cr0000gn/T/codex-clipboard-11cb7cbf-02bc-4bd3-b756-febf77d5d3b5.png` and `/var/folders/x4/5nzfn0y57dvbgdw6wsz3f2cr0000gn/T/codex-clipboard-ffb7dbe8-ff23-4d5e-af76-b7b3ea9f54df.png`.
- Runtime and viewports: production build served through the required `dev-verify` wrapper on port `3100`, using a disposable local SQLite database. Simplified Chinese was checked at desktop width and at `390 × 844` CSS pixels; English parity was covered by the localized render and build checks.
- Prompt evidence: the initial character inspiration is an animated placeholder and leaves the textarea value empty. Selecting Random Inspiration immediately writes the complete localized prompt into the textarea without replaying the typing animation.
- Project selector evidence: project creation exposes name, description, style, perspective and sprite size in one dialog. The open selector contains a `198px` scroll region, visibly fitting five full `36px` rows plus half of the sixth, while Add Project stays in a fixed footer below the scroll region.
- Validation evidence: native browser required bubbles are no longer used. Empty prompt and missing motion-reference messages render inline immediately to the left of the primary action. The empty required character-image upload uses the destructive border, background and text treatment and retains `aria-required`/`aria-invalid` semantics.
- Dashboard evidence: dashboard and project content shells no longer cap the right-side content width. At a `1280px` viewport the content fills the available main area with only the existing `24px` horizontal padding.
- Responsive evidence: the `390px` document remained exactly `390px` wide with no horizontal overflow. The project selector uses a full-width mobile row and the validation/action group wraps to its own row so the required hint remains visible rather than collapsing.

### Findings and Fixes

- P1: the first mobile validation layout allowed the hint to collapse to zero width when the project selector and submit button competed for one line. Fixed by wrapping the footer and reserving a full-width second row for validation plus the primary action.
- P2: the previous separate plus button made the relationship between selection and project creation ambiguous. Fixed by placing Add Project inside the selector footer and keeping it outside the scrolling project list.
- Result: no actionable P0, P1 or P2 finding remains for the four requested adjustments.

## Final Result (Homepage Project Composer Adjustments, 2026-09-15)

final result: passed
