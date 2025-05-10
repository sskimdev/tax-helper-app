// src/components/custom/FileUpload.tsx
import React, { useState, type ChangeEvent, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { FileText, XCircle } from 'lucide-react';

interface FileUploadProps {
  onFilesStaged: (stagedFiles: File[]) => void;
  maxFiles?: number;
  maxFileSizeMB?: number;
  acceptedFileTypes?: string;
  clearStagedFilesSignal?: boolean;
  onStagedFilesCleared?: () => void;
  // 컴포넌트별 고유 ID를 위한 prop 추가 (선택 사항)
  // idPrefix?: string;
}

export function FileUpload({
  onFilesStaged,
  maxFiles = 5,
  maxFileSizeMB = 5,
  acceptedFileTypes = "image/*,application/pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.zip",
  clearStagedFilesSignal,
  onStagedFilesCleared,
  // idPrefix = "file-upload" // 고유 ID를 위한 기본값
}: FileUploadProps): React.ReactNode {
  const { toast } = useToast();
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (clearStagedFilesSignal) {
      setStagedFiles([]);
      if (onStagedFilesCleared) {
        onStagedFilesCleared();
      }
    }
  }, [clearStagedFilesSignal, onStagedFilesCleared]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      if (stagedFiles.length + filesArray.length > maxFiles) {
        toast({ title: "파일 선택 제한", description: `최대 ${maxFiles}개까지 첨부할 수 있습니다. (현재 ${stagedFiles.length}개 선택됨)`, variant: "destructive" });
        event.target.value = ""; return;
      }
      const validFiles = filesArray.filter(file => {
          if (file.size > maxFileSizeMB * 1024 * 1024) { toast({ title: "파일 크기 초과", description: `${file.name} 파일의 크기가 ${maxFileSizeMB}MB를 초과합니다.`, variant: "destructive"}); return false; }
          if (stagedFiles.some(sf => sf.name === file.name && sf.size === file.size && sf.lastModified === file.lastModified)) { toast({ title: "중복 파일", description: `${file.name} 파일은 이미 선택 목록에 있습니다.`, variant: "default" }); return false; }
          return true;
      });
      const newStagedFiles = [...stagedFiles, ...validFiles];
      if (newStagedFiles.length > maxFiles) {
          toast({ title: "파일 개수 초과", description: `최대 ${maxFiles}개까지 첨부할 수 있습니다. 초과된 파일은 제외됩니다.`, variant: "destructive" });
          const limitedFiles = newStagedFiles.slice(0, maxFiles);
          setStagedFiles(limitedFiles);
          onFilesStaged(limitedFiles);
      } else {
          setStagedFiles(newStagedFiles);
          onFilesStaged(newStagedFiles);
      }
      event.target.value = "";
    }
  };

  const removeStagedFile = (fileToRemove: File): void => {
      const newStagedFiles = stagedFiles.filter(file => !(file.name === fileToRemove.name && file.size === fileToRemove.size && file.lastModified === fileToRemove.lastModified));
      setStagedFiles(newStagedFiles);
      onFilesStaged(newStagedFiles);
  };

  // const inputId = `<span class="math-inline">\{idPrefix\}\-input\-</span>{React.useId()}`; // React 18+ useId훅 사용 예시

  return (
    <div className="space-y-4">
      <div>
        {/* Label의 htmlFor와 Input의 id를 일치시키거나 Label로 Input을 감싸는 방식 사용 */}
        <Label htmlFor="file-upload-input-instance" className="mb-2 block text-sm font-medium">파일 선택</Label>
        <div className="flex items-center space-x-2">
            <Input id="file-upload-input-instance" type="file" multiple onChange={handleFileChange} accept={acceptedFileTypes} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
        </div>
        <p className="mt-1 text-xs text-muted-foreground"> 최대 {maxFiles}개, 각 {maxFileSizeMB}MB 이하. </p>
      </div>
      {stagedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">선택된 파일 (첨부 대기):</h4>
          <ul className="list-none space-y-1 text-sm">
            {stagedFiles.map((file, index) => ( // index 사용
              <li key={`<span class="math-inline">\{file\.name\}\-</span>{file.lastModified}-${index}`} className="flex items-center justify-between p-2 border rounded-md"> {/* index를 key에 활용 */}
                <div className="flex items-center space-x-2 truncate"> <FileText className="inline-block mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" /> <span className="truncate" title={file.name}>{file.name}</span> <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span> </div>
                <Button variant="ghost" size="icon" onClick={() => removeStagedFile(file)} title="선택 목록에서 제거"> <XCircle className="h-4 w-4 text-destructive" /> </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}