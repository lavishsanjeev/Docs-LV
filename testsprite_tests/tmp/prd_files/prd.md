# Product Requirements Document (PRD): Docs LV

## 1. Product Overview
**Docs LV** is a modern, premium SaaS document vault that allows users to securely upload, manage, and share their files. It employs a "Bring Your Own Storage" (BYOS) architecture, where users connect their own Supabase project to store their files, while authentication and routing are handled centrally.

## 2. Target Audience
Professionals, developers, and everyday users who need a clean, highly secure, and aesthetic file management dashboard without relying on centralized storage providers.

## 3. Tech Stack
- **Frontend/Framework:** Next.js (App Router), React, Tailwind CSS
- **Authentication:** Clerk
- **Storage/Database:** Supabase Storage (Client-provided credentials)
- **UI Components:** shadcn/ui, Lucide React, Custom CSS Animations

## 4. Core Features & Requirements

### 4.1 Authentication & Onboarding
- **User Authentication:** Handled via Clerk (Sign in, Sign up).
- **Storage Configuration:** 
  - Users must navigate to Settings to input their own `supabaseUrl` and `supabaseAnonKey`.
  - These credentials are securely stored in Clerk's `privateMetadata`.
  - The application dynamically instantiates a Supabase client using the active user's configured credentials.
  - If a user has not connected Supabase, the Dashboard shows a prominent "Connect Supabase First" placeholder.

### 4.2 Dashboard & Storage Analytics
- **Storage Usage Tracker:**
  - Displays a visual progress bar of total storage used.
  - Assumes a baseline 1GB limit (Supabase free tier).
  - Calculates total size by aggregating file metadata fetched from the user's `documents` bucket.

### 4.3 File Upload System
- **Drag & Drop / Multi-Select:** Users can queue multiple files at once via a drag-and-drop zone or file picker.
- **Duplicate Prevention:** The system checks the names of queued files against existing vault files and rejects duplicates with a toast notification.
- **Animated Progress Tracker:** 
  - Uses `XMLHttpRequest` (XHR) for precise byte-for-byte upload progress.
  - Displays a centered, dark-themed modal during upload with a smooth horizontal loading bar.
- **Success Animation:** Upon 100% completion, triggers a custom SVG "Google Pay-style" animated checkmark before refreshing the vault.

### 4.4 Vault & File Management (File List)
- **File Retrieval:** Fetches files from the user's `documents` bucket (`userId/`). Filters out hidden system folders like `.emptyFolderPlaceholder` and `.share`.
- **File Previews:** 
  - An inline "eye" button opens a large, centered, responsive modal (`Dialog`).
  - Supports rendering images, playing audio/video, and showing PDFs via iframes.
- **Rename Files:** Users can rename files. The backend uses the Supabase `.move()` operation while preserving the internal timestamp prefix needed for uniqueness.

### 4.5 File Deletion (Single & Batch)
- **Single Delete:** Clicking the trash icon opens a standard Yes/No confirmation dialog.
- **Batch Delete:** 
  - Users can select multiple checkboxes.
  - Clicking the floating "Delete" button opens a high-friction confirmation dialog.
  - Users must manually type `delete my files` to confirm. Features a "ghost text" UI effect that fills in as they type.

### 4.6 Secure File Sharing (Single & Batch)
- **Short Link Generation:** 
  - Generates professional links (e.g., `domain.com/s/user_123abc-a1b2c3d4`).
  - For batch shares, an array of file paths is saved to a hidden JSON file uploaded directly to the user's vault at `userId/.share/{shortId}.json`.
- **Public Share Portal (`/s/[token]`):**
  - Visitors hit the short link. The server parses the `userId` and `shortId`.
  - Fetches the host user's Supabase credentials, retrieves the hidden `.share` JSON file, and securely generates 1-hour signed URLs for download.
  - For single files, auto-redirects immediately to the file.
  - For multiple files, renders a secure "Shared Securely" landing page where visitors can download files individually.

## 5. Non-Functional Requirements
- **Security:** Strict path validation ensuring users can only interact with files under their designated `userId/` path in Supabase.
- **Performance:** Asynchronous uploads and dynamic rendering of file lists without heavy page reloads.
- **Design Aesthetics:** Premium minimal dark/light themes. Must maintain high UI polish, using smooth CSS animations and transitions (`slide-up`, `pop-in`).
