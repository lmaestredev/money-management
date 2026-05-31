---
name: Ethereal Finance
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#3cddc7'
  on-tertiary: '#003731'
  tertiary-container: '#008678'
  on-tertiary-container: '#000705'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#62fae3'
  tertiary-fixed-dim: '#3cddc7'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005047'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
---

## Brand & Style
The design system embodies a premium, futuristic approach to personal finance. It targets tech-savvy individuals and crypto-enthusiasts who value high-fidelity aesthetics and digital-first experiences. 

The visual style is a sophisticated blend of **Dark Mode Minimalism** and **Glassmorphism**. It relies on deep ebony backgrounds to make vibrant, neon-tinted accents pop. The atmosphere is one of security and innovation, achieved through:
- **Translucency:** Layered glass surfaces with background blurs to create depth without clutter.
- **Vibrancy:** High-saturation gradients that simulate light-emitting surfaces.
- **Fluidity:** Soft, oversized rounded corners and organic shapes that feel comfortable and modern.

## Colors
The palette is rooted in a "Pitch Black" foundation to maximize OLED contrast and power efficiency. 

- **Primary & Secondary:** A duo of Indigo (#6366F1) and Bright Purple (#A855F7) used for action-oriented elements and interactive states.
- **Accents:** Teal (#2DD4BF) serves as the "success" and "positive growth" indicator, while Soft Red (#F87171) is used for expenses and alerts.
- **Surfaces:** Deep Charcoal (#121212) is utilized for secondary containers to distinguish them from the pure black background. 
- **Glass:** Semi-transparent whites (5-12% opacity) are used for card overlays to achieve the frosted effect.

## Typography
The system utilizes **Inter** for its exceptional legibility in dark interfaces and its neutral, modern character.

- **Headlines:** Use tighter letter-spacing and heavier weights (Bold/SemiBold) to create a strong visual anchor.
- **Data Points:** Currency and balance displays should use `display-lg` to ensure they are the primary focal point of the dashboard.
- **Secondary Info:** Labels and timestamps use `label-md` with reduced opacity (60-70%) to maintain a clean hierarchy.

## Layout & Spacing
The layout follows a **Fluid Grid** model with generous internal padding to support the "glass" aesthetic.

- **Rhythm:** A strict 8px baseline grid ensures alignment across all components.
- **Margins:** Mobile screens utilize a 20px side margin. Cards and containers within the layout should use a 24px (md) padding internally to prevent content from feeling cramped against the highly rounded corners.
- **Stacking:** Vertical spacing between major sections (e.g., Total Balance to Transaction History) should be 32px (lg) to provide breathing room.

## Elevation & Depth
Depth is communicated through **Translucency and Background Blurs** rather than traditional drop shadows.

- **Base Layer:** Pitch Black (#000000).
- **Surface Layer:** Deep Charcoal (#121212) with 0.5px subtle inner borders (white at 10% opacity) to define edges.
- **Floating Layer (Glass):** Background blur (20px to 40px) with a semi-transparent fill. This layer is reserved for high-priority cards like credit card previews or modal overlays.
- **Interaction:** Hover or active states are indicated by increasing the "glow" of the element—applying a subtle outer bloom using the primary color at low opacity.

## Shapes
The shape language is defined by extreme roundedness to evoke a friendly, "liquid" feel.

- **Standard Containers:** Use `rounded-lg` (16px) for secondary items like list rows.
- **Primary Cards:** Use `rounded-xl` (24px to 32px) for main dashboard cards and feature blocks.
- **Interactive Elements:** Buttons and tags must be **Pill-shaped** (fully rounded ends) to contrast against the rectangular grid of the cards.

## Components
- **Buttons:** Primary buttons are pill-shaped with a vibrant Indigo-to-Purple gradient. Icons within buttons should be placed trailing the text.
- **Glass Cards:** Use a 1px "linear-gradient" border (top-left to bottom-right) from white (20% alpha) to transparent to simulate a light catch on the edge of the glass.
- **Transaction Lists:** Items are separated by subtle 1px dividers or grouped within a single charcoal container. Icons for transactions are contained within circular, low-opacity grey backgrounds.
- **Segmented Charts:** Bar charts use vertical capsules (pill-shaped bars). The active or selected segment is highlighted with the primary purple color and a subtle outer glow.
- **Input Fields:** Minimalist design with only a bottom border or a very subtle dark grey container, focusing on high-contrast white text for input.