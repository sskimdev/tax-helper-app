// src/components/custom/FileUpload.tsx
import React, { useState, type ChangeEvent, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { FileText, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploadProps {
  onFilesSelected: (selectedFiles: File[]) => void;
  maxFiles?: number;
  maxFileSizeMB?: number;
  acceptedFileTypes?: string;
  clearStagedFilesSignal?: boolean;
  onStagedFilesCleared?: () => void;
  onFilesStaged?: (selectedFiles: File[]) => void;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxFileSizeMB = 10,
  acceptedFileTypes = "image/*,application/pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.zip",
  clearStagedFilesSignal = false,
  onStagedFilesCleared,
  onFilesStaged,
}: FileUploadProps): React.ReactNode {
  const { toast } = useToast();
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [hasLargeFiles, setHasLargeFiles] = useState<boolean>(false);

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
        event.target.value = "";
        return;
      }

      const hasAnyLargeFile = filesArray.some(file => file.size > 2 * 1024 * 1024);
      setHasLargeFiles(hasAnyLargeFile);

      const validFiles = filesArray.filter(file => {
          if (file.size > maxFileSizeMB * 1024 * 1024) {
              toast({ title: "파일 크기 초과", description: `${file.name} 파일의 크기가 ${maxFileSizeMB}MB를 초과합니다.`, variant: "destructive"});
              return false;
          }
          if (stagedFiles.some(stagedFile => stagedFile.name === file.name && stagedFile.size === file.size)) {
              toast({ title: "중복 파일", description: `${file.name} 파일은 이미 선택 목록에 있습니다.`, variant: "default" });
              return false;
          }
          return true;
      });

      const newStagedFiles = [...stagedFiles, ...validFiles];
      if (newStagedFiles.length > maxFiles) {
          toast({ title: "파일 개수 초과", description: `최대 ${maxFiles}개까지 첨부할 수 있습니다. 초과된 파일은 제외됩니다.`, variant: "destructive" });
          const limitedFiles = newStagedFiles.slice(0, maxFiles);
          setStagedFiles(limitedFiles);
          onFilesSelected(limitedFiles);
          if (onFilesStaged) {
            onFilesStaged(limitedFiles);
          }
      } else {
          setStagedFiles(newStagedFiles);
          onFilesSelected(newStagedFiles);
          if (onFilesStaged) {
            onFilesStaged(newStagedFiles);
          }
      }
      event.target.value = "";
    }
  };

  const removeStagedFile = (fileNameToRemove: string): void => {
      const newStagedFiles = stagedFiles.filter(file => file.name !== fileNameToRemove);
      const stillHasLargeFiles = newStagedFiles.some(file => file.size > 2 * 1024 * 1024);
      setHasLargeFiles(stillHasLargeFiles);
      setStagedFiles(newStagedFiles);
      onFilesSelected(newStagedFiles);
      if (onFilesStaged) {
        onFilesStaged(newStagedFiles);
      }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="file-upload" className="mb-2 block text-sm font-medium">파일 선택</Label>
        <div className="flex items-center space-x-2">
            <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileChange}
                accept={acceptedFileTypes}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
            최대 {maxFiles}개, 각 {maxFileSizeMB}MB 이하. ({acceptedFileTypes.split(',').map(t => t.split('/')[1] || t).join(', ')})
        </p>
      </div>

      {hasLargeFiles && (
        <Alert variant="warning" className="border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700 text-sm">
            2MB를 초과하는 큰 파일이 포함되어 있습니다. 업로드에 시간이 더 걸릴 수 있으며, 업로드 중에는 페이지를 닫지 마세요.
          </AlertDescription>
        </Alert>
      )}

      {stagedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">선택된 파일 (첨부 대기):</h4>
          <ul className="list-none space-y-1 text-sm">
            {stagedFiles.map((file, index) => (
              <li key={`${file.name}-${index}-${file.lastModified}`} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center space-x-2 truncate">
                    <FileText className="inline-block mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate" title={file.name}>{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                      {file.size > 2 * 1024 * 1024 && 
                        <span className="text-yellow-600 ml-1">⚠️ 큰 파일</span>
                      }
                    </span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeStagedFile(file.name)} title="선택 목록에서 제거">
                    <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}