interface StencilItemProps {
  type: 'activity' | 'molecule' | 'proteinComplex';
  label: string;
  imageSrc: string;
}

const StencilItem = ({ type, label, imageSrc }: StencilItemProps) => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex flex-col items-center border-2 border-gray-200 
                 rounded-lg p-3 mb-2 cursor-grab hover:border-indigo-300 
                 transition-colors"
      onDragStart={onDragStart}
      draggable
    >
      <div className="h-12 w-12 mb-2">
        <img src={imageSrc} alt={label} className="w-full h-full object-contain" />
      </div>
      <div className="text-xs font-medium text-center uppercase">{label}</div>
    </div>
  );
};

export const StencilPanel = () => {
  return (
    <div className="w-24 border-r border-gray-200 bg-gray-50 p-2">
      <div className="text-sm font-semibold text-gray-700 mb-4">TOOLBOX</div>

      <StencilItem
        type="activity"
        label="Activity Unit"
        imageSrc="/assets/images/activity/default.png"
      />

      <StencilItem
        type="molecule"
        label="Molecule"
        imageSrc="/assets/images/activity/molecule.png"
      />

      <StencilItem
        type="proteinComplex"
        label="Protein Complex"
        imageSrc="/assets/images/activity/proteinComplex.png"
      />
    </div>
  );
};