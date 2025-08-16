import { SimpleImageUpload } from "./SimpleImageUpload";
import { DialogImageUpload } from "./DialogImageUpload";
import { Label } from "@/components/ui/label";
import { Link2 } from "lucide-react";
import type { UploadImageResult } from "@/lib/storage/image-upload";
import type { ActionResult } from "@/lib/core/result";

interface UnifiedImageUploadProps {
  context: "magazine" | "product" | "avatar";
  onUploadSuccess: (url: string, altText?: string) => void;
  uploadFunction: (formData: FormData) => Promise<ActionResult<UploadImageResult>>;
  trigger?: React.ReactNode;
  label?: string;
  currentValue?: string;
  disabled?: boolean;
  className?: string;
}

export function UnifiedImageUpload(props: UnifiedImageUploadProps) {
  // Mode dialog pour magazine et product, mode simple pour avatar uniquement
  if (props.context === "magazine" || props.context === "product") {
    return <DialogImageUpload {...props} context={props.context} />;
  }

  return <SimpleImageUpload {...props} context="avatar" />;
}

// Hook pour l'intégration avec react-hook-form
export function useImageUploadField() {
  return {
    render: ({
      field,
      uploadFunction,
      context = "product",
      label,
      required = false,
    }: {
      field: {
        value: string;
        onChange: (value: string) => void;
      };
      uploadFunction: (formData: FormData) => Promise<ActionResult<UploadImageResult>>;
      context?: "magazine" | "product" | "avatar";
      label?: string;
      required?: boolean;
    }) => (
      <div>
        <Label className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          {label || "Image"}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <UnifiedImageUpload
          context={context}
          uploadFunction={uploadFunction}
          onUploadSuccess={(url) => field.onChange(url)}
          currentValue={field.value}
        />
      </div>
    ),
  };
}

// Export des composants individuels
export { SimpleImageUpload } from "./SimpleImageUpload";
export { DialogImageUpload } from "./DialogImageUpload";
export { useImageUpload } from "./useImageUpload";
