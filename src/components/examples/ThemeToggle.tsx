import ThemeToggle from '../ThemeToggle'

export default function ThemeToggleExample() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span>Toggle between light and dark themes:</span>
        <ThemeToggle />
      </div>
      <p className="text-sm text-muted-foreground">
        The theme preference is saved to localStorage and respects system preferences.
      </p>
    </div>
  )
}