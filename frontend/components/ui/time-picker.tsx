import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string // HH:mm format
  onChange: (time: string) => void
  minTime?: string // HH:mm format
  maxTime?: string // HH:mm format
  className?: string
  disabled?: boolean
}

export function TimePicker({
  value,
  onChange,
  minTime = "00:00",
  maxTime = "23:59",
  className,
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedHour, setSelectedHour] = React.useState<string>("")
  const [selectedMinute, setSelectedMinute] = React.useState<string>("00")
  const [selectedPeriod, setSelectedPeriod] = React.useState<"AM" | "PM">("AM")

  // Initialize from value when component mounts or value changes
  React.useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(":")
      const hour24 = parseInt(hours, 10)
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
      setSelectedHour(hour12.toString())
      setSelectedMinute(minutes)
      setSelectedPeriod(hour24 >= 12 ? "PM" : "AM")
    }
  }, [value])

  // Generate hours (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString())
  
  // Generate minutes (00-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  const handleConfirm = () => {
    if (selectedHour && selectedMinute) {
      let hour24 = parseInt(selectedHour, 10)
      if (selectedPeriod === "PM" && hour24 !== 12) {
        hour24 += 12
      } else if (selectedPeriod === "AM" && hour24 === 12) {
        hour24 = 0
      }
      const timeString = `${hour24.toString().padStart(2, "0")}:${selectedMinute}`
      onChange(timeString)
      setOpen(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  const displayTime = value
    ? (() => {
        const [hours, minutes] = value.split(":")
        const hour24 = parseInt(hours, 10)
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
        const period = hour24 >= 12 ? "PM" : "AM"
        return `${hour12}:${minutes} ${period}`
      })()
    : "Select time"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal bg-slate-500/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white",
            !value && "text-slate-400",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs p-0 bg-slate-800 border-slate-700" align="start">
        <div className="p-3 space-y-3">
          <div className="text-xs font-semibold text-white">Select Time</div>
          
          {/* Time Selection Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Hours */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 mb-1 text-center">Hour</div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto scrollbar-thin">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => setSelectedHour(hour)}
                    className={cn(
                      "w-full px-2 py-1 text-xs rounded text-center transition-colors",
                      selectedHour === hour
                        ? "bg-amber-500 text-slate-900 font-semibold"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 mb-1 text-center">Min</div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto scrollbar-thin">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => setSelectedMinute(minute)}
                    className={cn(
                      "w-full px-2 py-1 text-xs rounded text-center transition-colors",
                      selectedMinute === minute
                        ? "bg-amber-500 text-slate-900 font-semibold"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 mb-1 text-center">Period</div>
              <div className="space-y-0.5">
                {(["AM", "PM"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={cn(
                      "w-full px-2 py-1 text-xs rounded text-center transition-colors",
                      selectedPeriod === period
                        ? "bg-amber-500 text-slate-900 font-semibold"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5 pt-2 border-t border-slate-700">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!selectedHour}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold h-7 text-xs"
            >
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
