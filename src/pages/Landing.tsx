import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, Users, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    console.log('Redirecting to login...');
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Investment CRM</h1>
          </div>
          <Button onClick={handleLogin} data-testid="button-login">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <Badge variant="secondary" className="text-sm">
            Professional Investment Banking Solution
          </Badge>
          
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Streamline Your Investment Banking Pipeline
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage leads, track prospects, and optimize your deal flow from qualified prospects 
            through pitching stages with our comprehensive CRM solution.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
              Get Started
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Built for Investment Professionals</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage your pipeline effectively and close more deals.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Lead Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Organize and track prospects through your pipeline with visual status indicators 
                and comprehensive contact management.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Pipeline Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get insights into your deal flow with comprehensive metrics, conversion rates, 
                and performance tracking across all stages.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Role-based access control with analyst, partner, and admin levels. 
                Assign leads and track team performance seamlessly.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-3xl font-bold">Ready to optimize your deal flow?</h3>
            <p className="text-muted-foreground">
              Join investment professionals who trust our platform to manage their pipeline effectively.
            </p>
            <Button size="lg" onClick={handleLogin} data-testid="button-cta-login">
              Start Your Pipeline Today
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Investment CRM. Built for investment banking professionals.</p>
        </div>
      </footer>
    </div>
  );
}