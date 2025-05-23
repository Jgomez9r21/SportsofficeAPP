"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"

interface IconsProps {
  icon: LucideIcon
  className?: string
}

const Icons = React.forwardRef<
  React.ElementRef<"svg">,
  IconsProps
>(({ icon: Icon, className, ...props }, ref) => {
  return <Icon ref={ref} {...props} className={className} />
})
Icons.displayName = "Icons"

export default Icons
