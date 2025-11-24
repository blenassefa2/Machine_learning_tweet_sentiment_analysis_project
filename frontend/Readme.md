# ML Pipeline Studio - Frontend Application

A modern, responsive single-page web application built with React, TypeScript, Material-UI, and Vite. This application provides an intuitive interface for managing Machine Learning data pipelines, including data upload, cleaning, classification, model training, and prediction capabilities.

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Component Documentation](#component-documentation)
- [Styling & Theming](#styling--theming)
- [Animations](#animations)
- [Responsive Design](#responsive-design)
- [Getting Started](#getting-started)
- [Development](#development)

## Project Overview

ML Pipeline Studio is a comprehensive frontend application designed to streamline the machine learning workflow. The application features:

- **Single-page application** with multiple sections
- **Full-screen hero section** with visual pipeline representation
- **Interactive configuration panels** for pipeline customization
- **File upload functionality** with drag-and-drop support
- **Continuous background animations** for enhanced user experience
- **Fully responsive design** for all device sizes

## Technology Stack

- **React 19.1.1** - UI library
- **TypeScript 5.9.3** - Type-safe JavaScript
- **Material-UI (MUI) 7.x** - Component library and design system
- **Vite 7.x** - Build tool and development server
- **Emotion** - CSS-in-JS styling
- **React DOM 19.1.1** - React rendering

## Features

### 1. Navigation Bar
- **Brain icon logo** (Psychology icon from MUI)
- Navigation links: Documentation, Models, Support
- Responsive design (links hidden on mobile)
- "Start" call-to-action button
- Smooth slide-down animation on load
- Interactive hover effects with color transitions and transforms

### 2. Hero Section
- **Full viewport height** (100vh) design
- Main title: "Complete ML Data Pipeline"
- Descriptive subtitle text
- **Horizontal pipeline visualization** showing:
  - Clean → Classify → Evaluate → Learn → Predict
  - **Classify rectangle** containing Manual/Auto options (no separate circle)
  - Manual and Auto classification methods displayed as circles inside the rectangle
  - Flow arrows connecting each step
- Staggered fade-in and slide-in animations
- Hover effects on pipeline elements

### 3. File Upload Section
- Drag-and-drop file upload area
- Click-to-browse functionality
- Visual feedback during drag operations
- Supported formats: PDF, DOC, DOCX, JPG, PNG, MP4 (Max 100MB)
- Smooth animations on load
- Hover lift effect on upload box

### 4. Configuration & Review Section

#### Pipeline Configuration Panel (3 columns):

**a) Data Cleaning:**
- Radio button options:
  - Remove Duplicates
  - Handle Missing Values (with strategy selector: Mean, Median, Mode, Drop Rows)
  - Normalize Data (with method selector: Standard Scaler, Min-Max Scaler, Robust Scaler)

**b) Classification:**
- Classifier algorithm dropdown:
  - Naive Bayes
  - SVM (with kernel selection: RBF, Linear, Polynomial, and C-value slider)
  - Random Forest (with n_estimators and max_depth sliders)
  - K-Nearest Neighbors (with k_neighbors slider)
- Dynamic parameter controls based on selected classifier

**c) Model Training:**
- Learning model dropdown:
  - Linear Regression
  - Logistic Regression
  - Decision Tree
  - Neural Network (with epochs, learning rate, and batch size sliders)
- Checkboxes:
  - Cross Validation (enabled by default)
  - Auto-tune Parameters
- Test split slider (10-40%)

**Advanced Configuration Accordion:**
- Random State input
- Early Stopping toggle with Patience slider
- Collapsible accordion design

#### Recent Uploads Panel:
- List of uploaded files with metadata (name, date, size)
- Action buttons: Clean, Classify, Train, Process
- Responsive button layout

### 5. Footer
- Copyright information
- Social media icons (GitHub, Twitter, LinkedIn)
- Responsive layout (column on mobile, row on desktop)
- Smooth hover animations on icons

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx          # Top navigation bar with logo and links
│   │   ├── Footer.tsx          # Bottom footer with copyright and social links
│   │   └── BackgroundAnimation.tsx  # Continuous background animations
│   ├── sections/
│   │   ├── Hero.tsx            # Hero section with pipeline visualization
│   │   ├── FileUpload.tsx      # File upload section with drag-and-drop
│   │   └── ConfigurationReview.tsx  # Configuration and recent uploads
│   ├── App.tsx                 # Main application component
│   ├── App.css                 # Global application styles
│   ├── index.css               # Base styles and theme variables
│   └── main.tsx                # Application entry point
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Readme.md
```

## Component Documentation

### BackgroundAnimation Component

**Purpose:** Provides continuous, subtle background animations throughout the entire application.

**Features:**
- **6 Bouncing Balls**: Different sizes (12-18px), varying bounce patterns
  - Animation durations: 15-25 seconds
  - Multiple bounce patterns (bounce, bounceSlow, bounceReverse)
  - Positioned across the viewport at different percentages
- **5 Flowing Lines**: Vertical lines moving from top to bottom
  - Animation durations: 12-20 seconds
  - Gradient opacity for smooth appearance/disappearance
  - Positioned at 15%, 35%, 55%, 75%, and 90% width
- **5 Floating Particles**: Small particles with rotation and floating motion
  - Animation durations: 8-12 seconds with staggered delays
  - Opacity changes for subtle effect

**Technical Details:**
- Fixed positioning (`position: fixed`)
- Z-index: 0 (behind all content)
- Pointer events disabled (`pointerEvents: 'none'`)
- Uses CSS keyframes for animations
- Color: `#646cff40` (blue with 25% opacity)


## Styling & Theming

### Color Scheme
- **Primary Color**: `#646cff` (Blue)
- **Primary Dark**: `#5058e6` (Darker blue for borders/hovers)
- **Background**: `#1a1a1a` (Dark)
- **Border Color**: `#333` (Dark gray)
- **Text Colors**: 
  - White (`#fff`) for primary text
  - Light gray (`#ccc`) for secondary text
  - Dark gray (`#999`) for tertiary text

### Material-UI Theme
- Dark mode enabled
- Custom primary color set to blue (`#646cff`)
- Dark background colors for papers and containers

### CSS-in-JS
- All styles use Material-UI's `sx` prop with Emotion
- Consistent spacing and typography scale
- Responsive breakpoints using MUI theme

## Animations

### Initial Load Animations

1. **Navbar:**
   - Slide-down animation (0.6s)

2. **Hero Section:**
   - Fade-in for container (0.6s)
   - Fade-in-up for title (0.8s)
   - Fade-in-up for description (1s with 0.2s delay)
   - Staggered slide-in-left for pipeline elements (0.6s - 1.8s)
   - Fade-in for arrows (0.8s - 1.8s)

3. **File Upload:**
   - Fade-in-up for title (0.8s)
   - Staggered animations for description and upload box (0.2s - 1s delays)

4. **Configuration Section:**
   - Fade-in-up for title (0.8s)
   - Staggered fade-in-up for cards (0.2s, 0.4s, 0.6s)
   - Fade-in-up for Recent Uploads (0.8s)

5. **Footer:**
   - Fade-in-up animation (0.8s)

### Hover Animations

- **Pipeline Circles**: Scale up (1.1x) on hover
- **Buttons**: Scale, lift, or color change effects
- **Configuration Cards**: Lift (translateY -5px) with glow shadow
- **Navbar Links**: Color change to primary color + lift
- **Social Icons**: Lift and scale on hover
- **Upload Box**: Lift with shadow on hover
- **Classify Rectangle**: Lift without color change (border remains same)

### Continuous Animations

- **Background Balls**: Continuous bouncing patterns
- **Flowing Lines**: Continuous top-to-bottom flow
- **Floating Particles**: Continuous floating and rotation

All animations use CSS keyframes with `ease-out` or `linear` timing functions for smooth, natural motion.

## Responsive Design

### Breakpoints
- **Mobile**: `< 768px` (md breakpoint)
- **Desktop**: `≥ 768px`



## Getting Started

### Prerequisites
- Node.js (v20.14.0 or higher recommended)
- npm (v10.7.0 or higher)

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

This will install all required packages including:
- React and React DOM
- Material-UI and icons
- TypeScript and related tools
- Vite build tool

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

### Building for Production

```bash
npm run build
```

The production build will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Development

### Key Development Features

- **Hot Module Replacement (HMR)**: Instant updates during development
- **TypeScript**: Full type checking for type safety
- **ESLint**: Code quality and consistency checks
- **Fast Refresh**: React component state preservation during development

### Code Style

- Functional components with hooks
- TypeScript for type safety
- Material-UI `sx` prop for styling
- Consistent component structure
- Descriptive variable and function names

### File Organization

- Components separated by functionality
- Sections for major page sections
- Shared components in components directory
- Styles co-located with components


## Notes

- All animations are optimized for performance using CSS transforms and opacity
- Background animations are non-interactive (pointer-events: none)
- Full-height sections only apply to Hero section
- File upload functionality is currently logged to console (backend integration pending)
- Configuration state management uses React hooks (useState)

## License

This project is part of the ML Pipeline Studio application suite.
