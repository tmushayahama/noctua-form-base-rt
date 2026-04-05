import type React from 'react'

interface SectionRowProps {
  label: string
  children: React.ReactNode
}

const SectionRow: React.FC<SectionRowProps> = ({ label, children }) => (
  <div className="border-b border-blue-800/70">
    <div className="flex items-start gap-3 px-4 py-2">
      <span className="w-[100px] shrink-0 pt-1.5 text-xs font-medium text-blue-800">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  </div>
)

export default SectionRow
