import OutreachTracker from '../OutreachTracker'

export default function OutreachTrackerExample() {
  // todo: remove mock functionality
  const mockOutreach = [
    {
      id: 'linkedin',
      type: 'linkedin' as const,
      enabled: true,
      lastContact: '2024-01-15',
      followUpDate: '2024-01-22',
      notes: 'Sent connection request, awaiting response'
    },
    {
      id: 'email',
      type: 'email' as const,
      enabled: true,
      lastContact: '2024-01-10',
      followUpDate: '2024-01-20',
      notes: 'Initial pitch sent, no response yet'
    }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <OutreachTracker 
        companyName="TechCorp Solutions"
        assignedTo="John Smith"
        initialOutreach={mockOutreach}
        onSave={(data) => console.log('Saved outreach data:', data)}
      />
    </div>
  )
}