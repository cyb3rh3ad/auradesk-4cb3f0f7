import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Check, Crown, Sparkles, Zap } from "lucide-react";

const Subscription = () => {
  const { 
    plan, 
    subscribed, 
    subscriptionEnd, 
    loading, 
    limits,
    createCheckoutSession,
    openCustomerPortal,
    tiers
  } = useSubscription();

  const plans = [
    {
      name: "Free",
      price: "€0",
      period: "/month",
      description: "Perfect for getting started",
      features: [
        "45-minute meetings",
        "15 AI tokens per week",
        "2GB file storage",
        "Basic support"
      ],
      icon: Sparkles,
      plan: "free" as const,
      current: plan === "free",
    },
    {
      name: "Advanced",
      price: tiers.advanced.price,
      period: "/month",
      description: "For growing teams",
      features: [
        "90-minute meetings",
        "20 AI tokens per week",
        "10GB file storage",
        "Priority support",
        "Advanced analytics"
      ],
      icon: Zap,
      plan: "advanced" as const,
      current: plan === "advanced",
      priceId: tiers.advanced.priceId,
    },
    {
      name: "Professional",
      price: tiers.professional.price,
      period: "/month",
      description: "For power users",
      features: [
        "Unlimited meetings",
        "Unlimited AI tokens",
        "Unlimited file storage",
        "24/7 premium support",
        "Advanced analytics",
        "API access"
      ],
      icon: Crown,
      plan: "professional" as const,
      current: plan === "professional",
      priceId: tiers.professional.priceId,
    },
  ];

  const handleUpgrade = (planType: 'advanced' | 'professional') => {
    createCheckoutSession(planType);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading subscription details...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Subscription Plans</h1>
              <p className="text-muted-foreground">Choose the perfect plan for your needs</p>
            </div>

            {subscribed && subscriptionEnd && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>
                    You are on the <span className="font-semibold text-foreground capitalize">{plan}</span> plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Renews on</p>
                      <p className="font-medium">{new Date(subscriptionEnd).toLocaleDateString()}</p>
                    </div>
                    <Button onClick={openCustomerPortal}>
                      Manage Subscription
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Your current limits:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Meetings: {limits.meetingDuration === 0 ? 'Unlimited' : `${limits.meetingDuration} minutes`}</li>
                      <li>• AI Tokens: {limits.weeklyTokens === 0 ? 'Unlimited' : `${limits.weeklyTokens} per week`}</li>
                      <li>• Storage: {limits.fileStorageGB === 0 ? 'Unlimited' : `${limits.fileStorageGB}GB`}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((planOption) => {
                const Icon = planOption.icon;
                return (
                  <Card 
                    key={planOption.name} 
                    className={planOption.current ? "border-primary shadow-lg" : ""}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Icon className="h-8 w-8 text-primary" />
                        {planOption.current && (
                          <Badge variant="default">Current Plan</Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl">{planOption.name}</CardTitle>
                      <CardDescription>{planOption.description}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-foreground">{planOption.price}</span>
                        <span className="text-muted-foreground">{planOption.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {planOption.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {!planOption.current && planOption.plan !== 'free' && (
                        <Button 
                          className="w-full" 
                          onClick={() => handleUpgrade(planOption.plan as 'advanced' | 'professional')}
                        >
                          Upgrade to {planOption.name}
                        </Button>
                      )}
                      {planOption.plan === 'free' && plan !== 'free' && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={openCustomerPortal}
                        >
                          Downgrade
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Subscription;