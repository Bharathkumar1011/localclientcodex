import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface MockRole {
  role: string;
  email: string;
  firstName: string;
  lastName: string;
  id: string;
  organizationId: number;
}

export default function MockLoginSelector() {
  const [roles, setRoles] = useState<MockRole[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/mock/roles`)
      .then(res => res.json())
      .then(data => setRoles(data.roles))
      .catch(err => console.error('Failed to load roles:', err));
  }, []);

  const handleLogin = async (role: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/mock/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role })
      });

      if (!response.ok) throw new Error('Login failed');

      toast({
        title: '✅ Login Successful',
        description: `Logged in as ${role}`,
      });

      // Redirect to dashboard
      window.location.href = '/';
    } catch (error) {
      toast({
        title: '❌ Login Failed',
        description: 'Could not log in',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 border-red-300',
      partner: 'bg-blue-100 text-blue-800 border-blue-300',
      analyst: 'bg-green-100 text-green-800 border-green-300',
      intern: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="text-5xl mb-3">🎭</div>
          <CardTitle className="text-3xl font-bold">Mock Login</CardTitle>
          <CardDescription className="text-base">
            Development Mode - Select a role to test the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {roles.map((mockRole) => (
              <Card 
                key={mockRole.role}
                className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
                onClick={() => handleLogin(mockRole.role)}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold uppercase border-2 ${getRoleColor(mockRole.role)}`}>
                      {mockRole.role}
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-lg">
                        {mockRole.firstName} {mockRole.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {mockRole.email}
                      </p>
                    </div>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLogin(mockRole.role);
                      }}
                      disabled={loading}
                      className="w-full mt-2"
                    >
                      {loading ? 'Logging in...' : `Login as ${mockRole.role}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>⚠️ Development Only:</strong> This screen only appears when{' '}
              <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-xs">
                USE_MOCK_AUTH=true
              </code>{' '}
              in your <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-xs">.env</code> file.
              In production, real authentication will be used.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
