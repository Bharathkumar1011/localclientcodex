import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, ExternalLink } from "lucide-react";

interface ContactDetails {
  name: string;
  designation: string;
  linkedin: string;
}

interface ContactDetailsFormProps {
  companyName: string;
  initialData?: Partial<ContactDetails>;
  onSave?: (data: ContactDetails) => void;
  onCancel?: () => void;
}

export default function ContactDetailsForm({ 
  companyName, 
  initialData = {}, 
  onSave, 
  onCancel 
}: ContactDetailsFormProps) {
  const [formData, setFormData] = useState<ContactDetails>({
    name: initialData.name || '',
    designation: initialData.designation || '',
    linkedin: initialData.linkedin || '',
  });

  const [errors, setErrors] = useState<Partial<ContactDetails>>({});

  const validateForm = () => {
    const newErrors: Partial<ContactDetails> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }

    if (!formData.linkedin.trim()) {
      newErrors.linkedin = 'LinkedIn profile is required';
    } else if (!formData.linkedin.includes('linkedin.com')) {
      newErrors.linkedin = 'Please enter a valid LinkedIn URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting contact details for:', companyName, formData);
    
    if (validateForm()) {
      onSave?.(formData);
    }
  };

  const handleInputChange = (field: keyof ContactDetails, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isFormValid = formData.name && formData.designation && formData.linkedin;

  return (
    <Card className="w-full max-w-2xl" data-testid="contact-details-form">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Contact Details - {companyName}
            <Badge variant="outline">Contact Required</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            data-testid="button-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Contact Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter contact name"
                className={errors.name ? 'border-destructive' : ''}
                data-testid="input-name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation">
                Designation <span className="text-destructive">*</span>
              </Label>
              <Input
                id="designation"
                type="text"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                placeholder="e.g. CFO, CEO, VP Finance"
                className={errors.designation ? 'border-destructive' : ''}
                data-testid="input-designation"
              />
              {errors.designation && (
                <p className="text-sm text-destructive">{errors.designation}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">
              LinkedIn Profile <span className="text-destructive">*</span>
            </Label>
            <div className="flex">
              <Input
                id="linkedin"
                type="url"
                value={formData.linkedin}
                onChange={(e) => handleInputChange('linkedin', e.target.value)}
                placeholder="https://linkedin.com/in/contact-name"
                className={`flex-1 ${errors.linkedin ? 'border-destructive' : ''}`}
                data-testid="input-linkedin"
              />
              {formData.linkedin && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={() => window.open(formData.linkedin, '_blank')}
                  data-testid="button-linkedin-preview"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            {errors.linkedin && (
              <p className="text-sm text-destructive">{errors.linkedin}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!isFormValid}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Contact Details
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}