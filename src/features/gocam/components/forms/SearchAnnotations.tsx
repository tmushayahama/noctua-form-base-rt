import type { AnnotationsResponse } from "@/features/search/models/search";
import { Checkbox, Button } from "@mui/material";
import { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import type { Aspect, Evidence } from "../../models/cam";
import { useSearchAnnotationsQuery } from "@/features/search/slices/lookupApiSlice";

interface SearchAnnotationsProps {
  gpId: string;
  aspect?: Aspect;
  term?: string;
  onSelectTerm: (result: AnnotationsResponse) => void;
}

const SearchAnnotations: React.FC<SearchAnnotationsProps> = ({
  gpId,
  aspect,
  term,
  onSelectTerm
}) => {

  console.log('SearchAnnotations', { gpId, aspect, term });
  const [selectedTerm, setSelectedTerm] = useState<AnnotationsResponse | null>(null);
  const [selectedEvidences, setSelectedEvidences] = useState<Evidence[]>([]);
  const { data: annotations = [] } = useSearchAnnotationsQuery({
    gpId,
    aspect,
    term,
  });

  const handleSelectTerm = (annotation: AnnotationsResponse) => {
    setSelectedTerm(annotation);
    setSelectedEvidences([]);
  };

  const handleEvidenceToggle = (evidence: Evidence) => {
    // Check if evidence is already selected by comparing UUID
    const isSelected = selectedEvidences.some(e => e.uid === evidence.uid);

    if (isSelected) {
      setSelectedEvidences(selectedEvidences.filter(e => e.uid !== evidence.uid));
    } else {
      setSelectedEvidences([...selectedEvidences, evidence]);
    }
  };

  const handleSave = () => {
    if (selectedTerm) {
      onSelectTerm({
        ...selectedTerm,
        evidences: selectedEvidences
      });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Left Panel - Activity Nodes */}
      <div className="col-span-1 border-r p-4 overflow-y-auto">
        <div className="mb-4">
          <div className="font-semibold">Select Term</div>
          <div className="text-xs text-gray-500">Please select below</div>
        </div>

        {annotations.map((annotation) => (
          <div
            key={annotation.uid}
            onClick={() => handleSelectTerm(annotation)}
            className={`
              flex items-center p-2 cursor-pointer border-b 
              ${selectedTerm?.term.id === annotation.uid
                ? 'bg-blue-100 font-bold'
                : 'hover:bg-gray-200'
              }
            `}
          >
            {selectedTerm?.uid === annotation.uid && (
              <FaCheckCircle className="mr-2 text-green-500" />
            )}
            <span>{annotation.term.label}</span>
          </div>
        ))}
      </div>

      {/* Right Panel - Evidence Table */}
      <div className="col-span-2 p-4">
        <div className="mb-4 flex justify-between items-center">
          <div className="font-semibold">
            Select Evidence {selectedTerm && `(${selectedTerm.term.label})`}
          </div>
          {selectedTerm?.evidences?.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedEvidences.length} of {selectedTerm?.evidences?.length} selected
            </div>
          )}
        </div>

        {/* Table Header with Select All */}
        <div className="flex border-b border-gray-300 py-2 font-medium text-gray-700 bg-gray-50">
          <div className="w-10">
            {selectedTerm?.evidences?.length > 0 && (
              <Checkbox
                checked={selectedTerm?.evidences && selectedTerm.evidences.length > 0 && selectedEvidences.length === (selectedTerm.evidences?.length || 0)}
                indeterminate={selectedEvidences.length > 0 && selectedEvidences.length < (selectedTerm?.evidences?.length || 0)}
                onChange={() => {
                  if (selectedTerm?.evidences && selectedTerm.evidences.length > 0) {
                    if (selectedEvidences.length < selectedTerm.evidences.length) {
                      setSelectedEvidences([...selectedTerm.evidences]);
                    } else {
                      setSelectedEvidences([]);
                    }
                  }
                }}
              />
            )}
          </div>
          <div className="flex-1">Evidence Code</div>
          <div className="flex-1">Reference</div>
          <div className="flex-1">With</div>
          <div className="flex-1">Assigned By</div>
        </div>

        {/* Table Body */}
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {selectedTerm?.evidences?.map((evidence: Evidence) => (
            <div
              key={evidence.uid}
              className="flex items-center border-b border-gray-200 hover:bg-gray-50 py-2 cursor-pointer"
              onClick={(e) => {
                // Only toggle if click wasn't on the checkbox itself
                if (!e.target.closest('input[type="checkbox"]')) {
                  handleEvidenceToggle(evidence);
                }
              }}
            >
              <div className="w-10">
                <Checkbox
                  checked={selectedEvidences.some(e => e.uid === evidence.uid)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleEvidenceToggle(evidence);
                  }}
                />
              </div>
              <div className="flex-1 truncate">{evidence.evidenceCode.label}</div>
              <div className="flex-1 truncate">{evidence.reference}</div>
              <div className="flex-1 truncate">{evidence.with}</div>
              <div className="flex-1 truncate">
                {evidence.groups?.map((group) => group.label).join(', ')}
              </div>
            </div>
          ))}

          {selectedTerm && (!selectedTerm.evidences || selectedTerm.evidences.length === 0) && (
            <div className="py-4 text-center text-gray-500">
              No evidence available for this term
            </div>
          )}

          {!selectedTerm && (
            <div className="py-4 text-center text-gray-500">
              Please select a term to view evidence
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <Button
            onClick={handleSave}
            disabled={!selectedTerm || selectedEvidences.length === 0}
            variant="contained"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchAnnotations;