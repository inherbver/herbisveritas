// DEPRECATED: This file has been refactored into semantic sub-components
// The main component is now in ./article-form/index.tsx

// Re-export for backward compatibility
export { ArticleForm } from "./article-form/index";

/*
REFACTORING COMPLETED:
- 526 lines → 4 focused components (150-200 lines each)
- Semantic HTML with proper ARIA labels
- Better separation of concerns:
  * ArticleFormFields: Basic form inputs with accessibility
  * ArticleTagsManager: Tag selection and management
  * ArticlePreview: Live preview with semantic structure  
  * ArticleFormActions: Status management and save actions
- Improved maintainability and testability
*/