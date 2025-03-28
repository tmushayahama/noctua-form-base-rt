import type React from 'react';
import { useState } from 'react';
import { Button } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import TermAutocomplete from '@/features/search/components/Autocomplete';
import { AutocompleteType, type GOlrResponse } from '@/features/search/models/search';

interface ActivityFormProps {
  onSubmit?: (data: any) => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ onSubmit }) => {
  const [termValue, setTermValue] = useState<GOlrResponse | null>(null);
  const [evidenceValue, setEvidenceValue] = useState<GOlrResponse | null>(null);
  const [referenceValue, setReferenceValue] = useState<string | null>(null);
  const [showTermDetails, setShowTermDetails] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<GOlrResponse | null>(null);

  // Categories for GO terms (biological process, molecular function, cellular component)
  const termCategories = [
    'GO:0008150',  // biological_process
    'GO:0003674',  // molecular_function
    'GO:0005575',  // cellular_component
  ];

  // Categories for evidence codes
  const evidenceCategories = [
    'ECO:0000000'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      term: termValue,
      evidence: evidenceValue,
      reference: referenceValue
    });
  };

  const handleOpenTermDetails = (event: React.MouseEvent, term: GOlrResponse) => {
    setSelectedTerm(term);
    setShowTermDetails(true);
  };

  const handleOpenReference = (event: React.MouseEvent) => {
    // Implementation for reference dialog would go here
    console.log("Open reference dialog");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="mb-4">Gene Ontology Annotation</h2>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <TermAutocomplete
            label="Gene Ontology Term"
            name="term"
            rootTypeIds={termCategories}
            autocompleteType={AutocompleteType.TERM}
            value={termValue}
            onChange={setTermValue}
            onOpenTermDetails={handleOpenTermDetails}
          />

          <TermAutocomplete
            label="Evidence Code"
            name="evidence"
            rootTypeIds={evidenceCategories}
            autocompleteType={AutocompleteType.EVIDENCE_CODE}
            value={evidenceValue}
            onChange={setEvidenceValue}
            onOpenTermDetails={handleOpenTermDetails}
          />

          <TermAutocomplete
            label="Reference"
            name="reference"
            rootTypeIds={[]}
            autocompleteType={AutocompleteType.REFERENCE}
            value={referenceValue}
            onChange={setReferenceValue}
            onOpenReference={handleOpenReference}
          />

          <div className="flex justify-end mt-6">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!termValue || !evidenceValue}
            >
              Submit Annotation
            </Button>
          </div>
        </div>
      </form>

      {/* Term Details Dialog */}
      <Dialog
        open={showTermDetails}
        onClose={() => setShowTermDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <div className="flex items-center">
            <InfoOutlined className="mr-2" />
            Term Details
          </div>
        </DialogTitle>
        <DialogContent>
          {selectedTerm && (
            <div className="space-y-4">
              <div>
                <h3>ID</h3>
                <div>{selectedTerm.id}</div>
              </div>

              <div>
                <h3>Label</h3>
                <div>{selectedTerm.label}</div>
              </div>

              {selectedTerm.description && (
                <div>
                  <h3>Description</h3>
                  <div>{selectedTerm.description}</div>
                </div>
              )}

              {selectedTerm.rootTypes && selectedTerm.rootTypes.length > 0 && (
                <div>
                  <h3>Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTerm.rootTypes.map((type, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {type.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTerm.isObsolete && (
                <div className="p-3 bg-amber-100 text-amber-800 rounded">
                  This term is obsolete. {selectedTerm.replacedBy && `Replaced by: ${selectedTerm.replacedBy}`}
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTermDetails(false)}>Close</Button>
          {selectedTerm && selectedTerm.link && (
            <Button
              color="primary"
              onClick={() => window.open(selectedTerm.link, '_blank')}
            >
              View in Ontology
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ActivityForm;