# Proposal Builder

<!-- Build triggered: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') -->

An AI-powered, voice-interactive platform for creating transparent project proposals for digital projects (design, branding, websites). This tool asks strategic questions to assess scope, audience, and goals, then provides a detailed estimate with real-time adjustment capabilities.

## Features

- **Voice-Interactive**: Answer questions using voice input (Web Speech API)
- **Strategic Questions**: Less than 11 carefully crafted questions covering:
  - Project scope and scale
  - Target audience
  - Project goals
  - Timeline and constraints
- **Transparent Estimates**: 
  - Detailed task breakdown with estimated hours
  - Visual bar chart showing task weight
  - Project timeline visualization
- **Real-Time Adjustments**: 
  - Adjustable sliders for each task (50% reduction to 100% increase)
  - Instant recalculation of total hours and timeline
  - Transparent base hours and multipliers
- **Smooth UX**: 
  - Progress tracking
  - Question summary view
  - Modern, responsive design
  - Strategic thinking prompts

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── ProposalBuilder.tsx      # Main component orchestrating the flow
│   ├── QuestionCard.tsx          # Individual question display with voice input
│   └── EstimateVisualization.tsx # Estimate display with charts and sliders
├── config/
│   └── questions.ts              # Question definitions
├── hooks/
│   └── useVoiceRecognition.ts   # Voice recognition hook
├── types/
│   └── index.ts                 # TypeScript type definitions
├── utils/
│   └── estimateEngine.ts        # Estimate calculation logic
├── App.tsx
├── main.tsx
└── index.css
```

## How It Works

1. **Question Flow**: Users answer up to 10 strategic questions about their project
2. **Voice Input**: Optional voice recognition for text-based questions
3. **Estimate Generation**: Answers are processed to calculate:
   - Base hours for each task category
   - Multipliers based on project complexity
   - Total project hours
   - Estimated timeline
4. **Real-Time Adjustment**: Users can adjust task multipliers using sliders to see immediate impact on:
   - Individual task hours
   - Total project hours
   - Project timeline

## Question Categories

- **Scope**: Project type, scale, content status, integrations
- **Audience**: Target audience, brand maturity
- **Goals**: Primary objectives, success metrics
- **Constraints**: Timeline preferences, revision expectations

## Technologies

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Web Speech API** for voice recognition
- **Lucide React** for icons

## Browser Support

Voice recognition requires a browser that supports the Web Speech API:
- Chrome/Edge (recommended)
- Safari (limited support)
- Firefox (not supported)

The tool gracefully degrades to text input if voice recognition is not available.

## Design Principles

- **Transparency**: All calculations and base values are visible
- **Time-Efficiency**: Minimal questions (< 11) with strategic focus
- **User Ownership**: Clients can adjust and understand their estimate
- **Strategic Thinking**: Questions prompt consideration of scope, audience, and goals
- **Smooth UX**: Progressive disclosure, clear progress, intuitive controls

## License

MIT
