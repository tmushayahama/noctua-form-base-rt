import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { FaPencilAlt, FaTrash } from 'react-icons/fa'

interface EditableCellProps {
  label: string
  onEdit?: () => void
  onDelete?: () => void
  className?: string
  style?: CSSProperties
  children: ReactNode
}

const EditableCell = forwardRef<HTMLDivElement, EditableCellProps>(
  ({ label, onEdit, onDelete, className = '', style, children }, ref) => (
    <div
      ref={ref}
      className={`group/cell relative break-words rounded-md border border-[#aaa] px-[5px] py-2 text-xs text-black hover:border-primary-500 ${className}`}
      style={style}
    >
      <div className="absolute -top-1.5 left-1 h-3 max-w-[80%] truncate bg-white px-1 text-[8px] leading-3 text-gray-500 group-hover/cell:text-primary-500">
        {label}
      </div>
      {children}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center text-red-400 hover:bg-red-400 hover:text-white group-hover/cell:flex"
        >
          <FaTrash size={10} />
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="absolute bottom-0 right-0 hidden h-5 w-5 items-center justify-center text-gray-400 hover:bg-primary-500 hover:text-white group-hover/cell:flex"
        >
          <FaPencilAlt size={9} />
        </button>
      )}
    </div>
  )
)

EditableCell.displayName = 'EditableCell'

export default EditableCell
