
import { globalKnownRelations } from '@/@pango.core/data/relations';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import type { Activity } from '@/features/gocam/models/cam';
import { Typography, FormControl, RadioGroup, FormControlLabel, Radio, Divider, TextField } from '@mui/material';
import { useState, useMemo, useEffect } from 'react';
import type { RelationId } from '../models/decisionTree';
import { ConnectorType, ActivityRelationshipId, ActivityMoleculeRelationshipId, MoleculeActivityRelationshipId, definitions, EffectDirectionId, DirectnessId } from '../models/decisionTree';
import { getConnectorType, reverseLookup } from '../services/decisionTree';
import { resetSelection, updateSelection } from '../slices/relationSlice';

interface Props {
  sourceActivity: Activity;
  targetActivity: Activity;
}

const relationLabelMap = new Map<string, string>();
globalKnownRelations.forEach((r) => {
  relationLabelMap.set(r.id, r.label);
});

const RelationForm: React.FC<Props> = ({ sourceActivity, targetActivity }) => {
  const dispatch = useAppDispatch();
  const { selected, relation } = useAppSelector((state) => state.relation);

  const [manualRelation, setManualRelation] = useState<string>('');

  const connectorType = useMemo(
    () => getConnectorType(sourceActivity.type, targetActivity.type),
    [sourceActivity.type, targetActivity.type]
  );

  useEffect(() => {
    dispatch(resetSelection({ sourceType: sourceActivity.type, targetType: targetActivity.type }));
  }, [dispatch, sourceActivity.type, targetActivity.type]);

  useEffect(() => {
    if (manualRelation && relation !== manualRelation) {
      const result = reverseLookup(manualRelation as RelationId);
      if (result) dispatch(updateSelection(result));
    }
  }, [manualRelation, relation, dispatch]);

  const relationshipOptions =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY
      ? Object.values(ActivityRelationshipId)
      : connectorType === ConnectorType.ACTIVITY_MOLECULE
        ? Object.values(ActivityMoleculeRelationshipId)
        : Object.values(MoleculeActivityRelationshipId);

  const definitionMap = definitions[
    connectorType === ConnectorType.ACTIVITY_ACTIVITY
      ? 'activityRelationship'
      : connectorType === ConnectorType.ACTIVITY_MOLECULE
        ? 'activityMoleculeRelationship'
        : 'moleculeActivityRelationship'
  ];

  const shouldShowDirection =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
      selected.relationshipId === ActivityRelationshipId.REGULATION
      ? true
      : connectorType === ConnectorType.MOLECULE_ACTIVITY &&
        selected.relationshipId === MoleculeActivityRelationshipId.REGULATES
        ? true
        : selected.relationshipId === ActivityRelationshipId.UNDETERMINED;

  const shouldShowDirectness =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
    selected.relationshipId === ActivityRelationshipId.REGULATION;

  const onRadioChange =
    (field: 'relationshipId' | 'directionId' | 'directnessId') =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(updateSelection({ [field]: event.target.value }));
      };

  return (
    <div className="bg-white shadow-md p-4 rounded w-full max-w-4xl">
      <div className="flex items-center justify-between border-b pb-2 mb-4">
        <h2 className="text-xl font-semibold">Causal Relation Form</h2>
        <button className="border px-4 py-1 text-blue-600 rounded hover:bg-gray-100">
          Close
        </button>
      </div>

      {/* Relationship */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-2">
          <Typography className="font-medium w-[150px]">Relationship</Typography>
        </div>
        <FormControl component="fieldset">
          <RadioGroup
            name="relationship"
            value={selected.relationshipId}
            onChange={onRadioChange('relationshipId')}
          >
            {relationshipOptions.map((key) => {
              const def = definitionMap[key];
              return (
                <div key={key} className="flex items-start border-b py-2">
                  <FormControlLabel
                    value={key}
                    control={<Radio />}
                    label={def.label}
                    className="w-[180px]"
                  />
                  {def.description && (
                    <Typography className="text-sm italic text-gray-600 max-w-md">
                      {def.description}
                    </Typography>
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </FormControl>
      </div>

      {/* Effect Direction */}
      {shouldShowDirection && (
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-2">
            <Typography className="font-medium w-[150px]">Effect Direction</Typography>
          </div>
          <FormControl component="fieldset">
            <RadioGroup
              name="effectDirection"
              value={selected.directionId || ''}
              onChange={onRadioChange('directionId')}
            >
              {Object.values(EffectDirectionId).map((dir) => (
                <FormControlLabel key={dir} value={dir} control={<Radio />} label={dir.split(':')[1]} />
              ))}
            </RadioGroup>
            <Typography className="text-sm italic text-gray-500 mt-1 ml-1">
              The mechanism of regulation should be known to determine the direction.
            </Typography>
          </FormControl>
        </div>
      )}

      {/* Directness */}
      {shouldShowDirectness && (
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-2">
            <Typography className="font-medium w-[150px]">Directness</Typography>
          </div>
          <FormControl component="fieldset">
            <RadioGroup
              name="directness"
              value={selected.directnessId || ''}
              onChange={onRadioChange('directnessId')}
            >
              {Object.values(DirectnessId).map((dir) => (
                <div key={dir} className="flex items-start border-b py-2">
                  <FormControlLabel
                    value={dir}
                    control={<Radio />}
                    label={definitions.directness[dir].label}
                    className="w-[180px]"
                  />
                  {definitions.directness[dir].description && (
                    <Typography className="text-sm italic text-gray-600 max-w-md">
                      {definitions.directness[dir].description}
                    </Typography>
                  )}
                </div>
              ))}
            </RadioGroup>
          </FormControl>
        </div>
      )}

      {/* Result and Reverse Lookup */}
      <Divider className="my-6" />
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-4">
          <Typography className="font-semibold w-[150px]">Resulting Relation</Typography>
          <Typography className="text-blue-700 font-medium">
            {relation ? relationLabelMap.get(relation) || relation : 'No valid relation'}
          </Typography>
        </div>

        <div className="flex items-start gap-4">
          <Typography className="w-[150px] font-medium">Reverse Lookup</Typography>
          <TextField
            size="small"
            placeholder="Enter Relation ID (e.g. RO:0002304)"
            className="w-full max-w-md"
            value={manualRelation}
            onChange={(e) => setManualRelation(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default RelationForm;