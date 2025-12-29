/**
 * Page header for Edit Preferences view
 * Displays title and description for the preferences editing page
 */

export default function PageHeader() {
  return (
    <header className="mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 leading-relaxed">
        Edit Your Travel Preferences
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
        Update your default travel settings. These preferences will be used when creating new travel plans.
      </p>
    </header>
  );
}
