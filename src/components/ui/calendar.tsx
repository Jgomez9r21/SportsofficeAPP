
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown-buttons", // Default caption layout
  fromYear,
  toYear,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: captionLayout === "dropdown-buttons" ? "hidden" : "text-sm font-medium", // Hide default label when dropdowns are used
        caption_dropdowns: "flex gap-1", // Style for dropdown container
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100" // Removed rounded-md
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground w-9 font-normal text-[0.8rem]", // Ensure head cells are square, removed rounded-none
        row: "flex w-full mt-2",
        cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20", // Ensure cells are square, removed rounded-none
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100" // Ensure days are square, removed rounded-none
        ),
        day_range_end: "day-range-end", // Removed rounded-none
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground", // Ensure selected day is square, removed rounded-none
        day_today: "text-accent-foreground", // Default today styling, can be overridden, removed rounded-none
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30", // Removed rounded-none
        day_disabled: "text-muted-foreground opacity-50 !cursor-not-allowed", // Ensure disabled days show not-allowed cursor and are square, removed rounded-none
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground", // Removed rounded-none
        day_hidden: "invisible",
        ...classNames, // Allow overriding any class via props
      }}
      components={{
        IconLeft: ({ className: iconClassName, ...iconProps }) => ( 
          <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...iconProps} />
        ),
        IconRight: ({ className: iconClassName, ...iconProps }) => ( 
          <ChevronRight className={cn("h-4 w-4", iconClassName)} {...iconProps} />
        ),
      }}
      captionLayout={captionLayout} 
      fromYear={fromYear} 
      toYear={toYear} 
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
