import ContactDetailsForm from '../ContactDetailsForm'

export default function ContactDetailsFormExample() {
  // todo: remove mock functionality
  const mockInitialData = {
    name: "Sarah Johnson",
    designation: "CFO",
    linkedin: "https://linkedin.com/in/sarahjohnson"
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ContactDetailsForm 
        companyName="TechCorp Solutions"
        initialData={mockInitialData}
        onSave={(data) => console.log('Saved contact details:', data)}
        onCancel={() => console.log('Form cancelled')}
      />
    </div>
  )
}