---
version: 1.0
name: 排课助手 (PaiKe Helper)
description: >
  A scheduling + AI journaling tool for independent fitness coaches (yoga, pilates, personal training).
  The design system blends Lululemon's athletic calm with Linear's task-first minimalism —
  warm greens, generous whitespace, large tap targets, and motion that signals completion
  rather than urgency. Every visual decision serves one goal: help the coach finish the
  post-class summary flow in under 3 seconds, so they can get back to their students.
---

## Design Philosophy

**"Professional calm — like a well-lit studio, not a dashboard."**

This is not a data-heavy SaaS tool. It's a companion app that lives in the pocket of
a coach who moves between sessions. It should feel:

- **Restful, not demanding**: No red badges that scream for attention. Status cues are
  soft amber dots and quiet green checks.
- **Glanceable**: The coach should understand today in one look. One screen, one question answered.
- **One-thumb reachable**: Primary actions ("send summary", "schedule next") live in the
  bottom 60% of the screen, reachable without grip adjustment.
- **Rewarding**: Completing a summary sends a gentle, satisfying animation — not a jarring
  success alert.

The app has two modes:

1. **Pulse mode (default)**: "What's happening now?" — today's sessions, upcoming count, pending summaries.
2. **Plan mode**: The full week grid for scheduling. Accessed intentionally, not on launch.

## Color Palette

Inspired by yoga studio interiors — matte wood floors, cream walls, eucalyptus green accents,
morning light through linen curtains.

```yaml
colors:
  # Brand
  primary:        "#4A7C59"   # Deep sage — calm, athletic, premium
  primary-light:  "#E8F0EA"   # Sage mist — backgrounds, selected states
  primary-dark:   "#3A6347"   # Pressed / active states

  # Neutrals
  canvas:         "#FAF8F5"   # Page background — warm off-white (never pure white)
  surface:        "#FFFFFF"   # Card background
  surface-soft:   "#F5F3EF"   # Subtle surface differentiation
  hairline:       "#E8E4DF"   # Borders, dividers
  hairline-soft:  "#F0EDE8"   # Lighter dividers

  # Ink
  ink:            "#1C1C1C"   # Primary text
  ink-secondary:  "#6B6560"   # Secondary text, labels
  ink-muted:      "#9E9892"   # Placeholder, disabled

  # Status (soft, not neon)
  status-scheduled:   "#E8C98E"  # Warm amber — "happening soon"
  status-completed:   "#7BAF8A"  # Muted green — "done"
  status-cancelled:   "#D4CEC8"  # Warm gray — "removed"
  status-noshow:      "#E0A89E"  # Muted coral — "missed"

  # Semantic
  success:         "#5C9A6F"  # Confirmation green
  warning:         "#D4A853"  # Attention amber
  error:           "#C26B5E"  # Gentle red (never aggressive)

  # Accent (sparing use)
  accent:          "#C2855C"  # Terracotta — warmth accent, used for the 🔴 post-class dot

  # Overlay
  overlay:         "rgba(28, 28, 28, 0.4)"
```

### Color Usage Rules

- Never use `primary` for status badges. Status has its own scale.
- `accent` (terracotta) is used ONLY for the post-class reminder dot. It's the app's
  most critical visual signal — make it count.
- Background is always `canvas` or `surface`, never pure `#FFFFFF` (too clinical for wellness).
- Gradients: not used. This is a flat design system. Depth comes from layering and shadow,
  not color blending.

## Typography

WeChat Mini Programs use system fonts. We cannot load custom typefaces.
Fallbacks are tuned for Chinese + Latin readability.

```yaml
typography:
  # System font stack for mini programs
  font-family: >
    -apple-system, BlinkMacSystemFont, "PingFang SC",
    "Helvetica Neue", "Microsoft YaHei", sans-serif

  # Type scale (in rpx, 1rpx = 0.5px at 375px width)
  # Designed for 375px-414px screens (iPhone SE to iPhone 16 Pro Max)

  title-xl:
    fontSize: 40rpx       # 20px — page titles
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0

  title-lg:
    fontSize: 34rpx       # 17px — card headlines
    fontWeight: 600
    lineHeight: 1.35

  title-md:
    fontSize: 30rpx       # 15px — section headers, day labels
    fontWeight: 600
    lineHeight: 1.4

  body:
    fontSize: 28rpx       # 14px — primary body text
    fontWeight: 400
    lineHeight: 1.6

  body-sm:
    fontSize: 24rpx       # 12px — secondary info, time labels
    fontWeight: 400
    lineHeight: 1.5

  caption:
    fontSize: 20rpx       # 10px — meta, badges, tiny labels
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.5px

  button:
    fontSize: 28rpx       # 14px — button text
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 0.3px
```

### Typography Rules

- Maximum 3 text sizes per screen. If you need 4, the information hierarchy is wrong.
- `title-xl` is reserved for the current page name only. Never stack two `title-xl`.
- Body text always uses `ink` (not `ink-secondary`). If it's worth showing, it's worth reading.
- `ink-secondary` is for labels like "时间", "地点", "课程类型" — field names, not values.

## Spacing

A 4px base grid, tuned for Chinese text and mobile.

```yaml
spacing:
  xs: 8rpx     # 4px  — tight internal padding (icon-to-label, badge padding)
  sm: 16rpx    # 8px  — element spacing within a card
  md: 24rpx    # 12px — standard padding inside cards
  lg: 32rpx    # 16px — card-to-card gap, page padding
  xl: 48rpx    # 24px — section separation
  xxl: 64rpx   # 32px — major content blocks
```

### Spacing Rules

- Page horizontal padding: `lg` (32rpx)
- Card internal padding: `md` (24rpx)
- Card gap: `lg` (32rpx)
- Section bottom margin: `xl` (48rpx)
- Everything must breathe. If a screen feels cramped, add `sm` (8rpx) to the offender,
  not `xs` (4rpx). Generosity beats density.

## Border Radius

```yaml
radius:
  sm: 8rpx    # Inputs, tags, small badges
  md: 16rpx   # Cards, modals, list items
  lg: 24rpx   # Large cards, featured content
  pill: 48rpx # Buttons, chips, status badges
```

### Radius Rules

- Cards: `md` (16rpx)
- Buttons: `pill` (48rpx) — always. Never square buttons.
- Inputs: `sm` (8rpx) with `hairline` border
- The app should feel "soft but precise" — like a yoga mat, not a spreadsheet.

## Shadows

Light, atmospheric. Cards should feel like paper on a desk, not floating UI.

```yaml
shadows:
  card:     "0 2rpx 12rpx rgba(28, 28, 28, 0.04)"   # Default card
  card-hover: "0 4rpx 20rpx rgba(28, 28, 28, 0.06)"  # Tapped card
  float:    "0 8rpx 32rpx rgba(28, 28, 28, 0.08)"    # FAB, bottom sheets
  modal:    "0 16rpx 48rpx rgba(28, 28, 28, 0.12)"   # Modal overlay
```

### Shadow Rules

- Use `card` for all content cards in lists.
- Use `float` for the FAB ("+ 排课") and persistent bottom actions.
- Never use box-shadow on text or inline elements.

## Iconography

- Style: 2px stroke, rounded caps, filled variants for selected states
- Size: 40rpx (20px) for tab bar, 32rpx (16px) for inline icons, 48rpx (24px) for standalone
- Color: `ink-secondary` default, `primary` when active, `ink-muted` when disabled
- All icons sourced from the project's `assets/images/` directory. No icon font dependencies.

## Components

### Card

The fundamental building block. Every list item, session, member, and summary is a card.

```css
.card {
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-card);
}
```

- Cards have NO border. Depth comes from shadow alone.
- Card groups (lists) use `lg` gap.
- A card is tappable if it navigates. Add `:active { opacity: 0.7 }` transition (150ms ease).

### Button

```css
/* Primary */
.btn-primary {
  background: var(--color-primary);
  color: #FFFFFF;
  border-radius: var(--radius-pill);
  padding: 18rpx 48rpx;
  font-weight: 600;
  min-height: 88rpx;  /* 44px — Apple HIG minimum tap target */
}
.btn-primary:active {
  background: var(--color-primary-dark);
  transform: scale(0.97);
  transition: transform 100ms ease;
}

/* Secondary / Ghost */
.btn-ghost {
  background: transparent;
  color: var(--color-primary);
  border: 2rpx solid var(--color-primary);
  border-radius: var(--radius-pill);
  padding: 16rpx 48rpx;
  min-height: 88rpx;
}
```

- **Minimum tap target: 88rpx (44px).** This is non-negotiable for coach use (hands may be
  sweaty, one-handed operation, moving between locations).
- Primary action per screen: exactly ONE. If you have two primary buttons, neither is primary.
- Destructive actions (delete, cancel lesson) use `btn-ghost` with `color: var(--semantic-error)`
  and `border-color: var(--semantic-error)`.

### FAB (Floating Action Button)

- Position: bottom-right, 48rpx from edges (above tab bar safe area)
- Size: 96rpx diameter
- Shadow: `var(--shadow-float)`
- Content: "+" icon, 40rpx
- The FAB is the ONLY permanently floating element. Nothing else competes for that corner.

### Post-Class Dot (🔴)

The most important signal in the entire app.

- Size: 16rpx diameter
- Color: `var(--color-accent)` (terracotta) — distinct from status colors
- Position: top-right corner of a session card, 8rpx inset
- Animation: subtle pulse (opacity 0.6 → 1.0, 2s loop) — "there's something to do"
- After summary sent: dot changes to a green check (16rpx, `var(--semantic-success)`), static
- This dot IS the product's core UX pattern. Treat it with reverence.

### Status Badge

Small pill-shaped indicator for session status.

```css
.badge {
  font-size: var(--font-caption);
  padding: 4rpx 16rpx;
  border-radius: var(--radius-pill);
  font-weight: 500;
}
.badge--scheduled { background: #F5EDDC; color: #8B7340; }
.badge--completed { background: #E4F0E7; color: #4A7C59; }
.badge--cancelled { background: #F0EDE8; color: #9E9892; }
.badge--noshow    { background: #F5E8E4; color: #A0685C; }
```

- Badges use tinted backgrounds (pastel), never solid status colors.
- Text is always slightly darker than the background for readability.

### Empty State

- Centered vertically in the available space (not absolute center of screen)
- Illustration: simple line art, 320rpx max width, `opacity: 0.4`
- Title: `body`, `ink-secondary`, 24rpx below illustration
- Subtitle / CTA: `body-sm`, `ink-muted`, 8rpx below title, with a `btn-primary` 32rpx below
- Empty states should feel "calm and inviting", not "broken and sad"

### Tab Bar

```css
.tab-bar {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-top: 1rpx solid var(--hairline-soft);
  height: 100rpx;
  padding-bottom: env(safe-area-inset-bottom);
}
```

- Tab icons: 40rpx, `ink-muted` inactive, `primary` active
- Tab labels: `caption`, `ink-muted` inactive, `primary` active
- Active tab gets a 4rpx dot indicator above the icon (4rpx × 4rpx, `primary`)

## Layout Principles

### Screen Architecture

```
┌─────────────────────┐
│  Navigation Bar     │  ← No shadow. Flat with canvas bg.
├─────────────────────┤
│                     │
│  Content Area       │  ← Scrollable. Generous padding.
│                     │
│                     │
├─────────────────────┤
│  Bottom Action      │  ← Optional. Pinned. Contains primary CTA.
├─────────────────────┤
│  Tab Bar            │  ← Translucent with blur.
└─────────────────────┘
     safe-area-inset-bottom
```

- Navigation bar: `primary` background with white text OR `surface` background with `ink` text.
  NEVER gradient backgrounds on nav bars.
- Content starts immediately below nav bar. No hero banners, no promotional space.
- Bottom action bar: use for single-screen flows (session edit save, summary send).
  NOT for browse screens (member list, settings).

### The "3-Second Flow"

The post-class summary flow is the product's reason to exist. The UI must be frictionless:

1. **Trigger**: Post-class dot appears on session card (automatic, no coach action)
2. **View**: Tap card → summary page opens. AI text is already rendered. No loading spinner.
3. **Review**: Coach reads the AI-generated summary. Edit button available but not required.
4. **Send**: One thumb tap on the bottom "发送给学员" button.
5. **Done**: Success animation (gentle checkmark bloom, 400ms). Card dot turns green.

Design constraints for this flow:
- Page transition: slide-left (native `wx.navigateTo`), 300ms
- Summary text: pre-rendered before page opens (generate on course-end status change, not on tap)
- Send button: fixed to bottom of screen, always visible, 88rpx height
- Edit mode: inline text editing, not a separate page. Tap text → it becomes editable.
- After send: auto-navigate back. No "success" modal — the green dot on the card IS the confirmation.

## Motion

Animations should feel like breathing, not like UI tricks.

```yaml
motion:
  duration:
    instant: 100ms   # Button press feedback
    quick:   200ms   # Page transitions, card appear
    calm:    400ms   # Success checkmark, content reveal
    slow:    600ms   # Empty state illustration fade-in

  easing:
    default: "ease-out"           # Most animations
    decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1.0)"  # Cards appearing
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1.0)"    # Success checkmark
```

### Motion Rules

- Page transitions: `wx.navigateTo` default (slide-left, ~300ms). Don't customize.
- Card tap: `scale(0.97)` on `:active`, 100ms. Instant tactile feedback.
- List item appear: stagger by 50ms per item, `quick` duration, `decelerate` easing.
  Example: 5 cards = 250ms total stagger + 200ms animation = 450ms full reveal.
- Success checkmark: `calm` duration, `spring` easing. The product's emotional payoff.
- NEVER use: bounce, shake, flash, rotate, or any animation that conveys urgency/anxiety.

## Anti-Patterns

Things this design system explicitly forbids:

- ❌ Pure white backgrounds (`#FFFFFF`) — always use `canvas` or `surface`
- ❌ Red badges or notification counts — use the post-class dot pattern instead
- ❌ Gradients on buttons, nav bars, or backgrounds
- ❌ Neon or highly saturated colors anywhere
- ❌ More than 2 font weights on a single screen
- ❌ Center-aligned body text — left-align everything except empty states
- ❌ "Success!" or "Great job!" modals — the animation IS the feedback
- ❌ Skeleton loaders — the app is local-first. If it needs a loader, the data model is wrong.
- ❌ Emoji as icons — use actual icon assets
- ❌ Under 44px (88rpx) tap targets for any interactive element

## Implementation Notes

### For WeChat Mini Programs

- Theme variables defined in `app.wxss` under the `page` selector
- All colors reference CSS custom properties (e.g., `var(--color-primary)`)
- `utils/theme.js` manages theme selection — currently single theme, architecture supports multiple
- Components use `properties` for data, `triggerEvent` for actions
- Never hardcode color values in component `.wxss` files

### CSS Variable Names

The app uses semantic variable names, not color names:

```
--color-primary, --color-primary-light, --color-primary-dark
--bg-page, --bg-card, --bg-input
--text-primary, --text-secondary, --text-muted
--radius-sm, --radius-md, --radius-lg, --radius-pill
--shadow-card, --shadow-card-hover, --shadow-float
--spacing-xs, --spacing-sm, --spacing-md, --spacing-lg, --spacing-xl
--font-xs, --font-sm, --font-md, --font-lg, --font-xl, --font-title
--color-scheduled, --color-completed, --color-cancelled, --color-noshow
```

## References

- DESIGN.md concept: [Google Stitch](https://stitch.withgoogle.com/docs/design-md/overview/)
- DESIGN.md collection: [awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
- Tap target guidelines: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- WeChat Mini Program design: [WeChat Design Guidelines](https://developers.weixin.qq.com/miniprogram/design/)
