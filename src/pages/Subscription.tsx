import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubscription } from "@/hooks/useSubscription";
import { usePromoCode } from "@/hooks/usePromoCode";
import { Check, Crown, Sparkles, Zap, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const Subscription = () => {
  const { 
    plan, 
    subscribed, 
    subscriptionEnd, 
    loading, 
    limits,
    openCustomerPortal,
    tiers,
    checkSubscription
  } = useSubscription();

  const { validating, validPromoCode, validatePromoCode, clearPromoCode } = usePromoCode();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [activating, setActivating] = useState(false);

  // Calculate discounted price
  const getDiscountedPrice = (originalPrice: string): string => {
    if (!validPromoCode) return originalPrice;
    
    const numericPrice = parseFloat(originalPrice.replace('€', ''));
    const discountedPrice = numericPrice * (1 - validPromoCode.discount_percent / 100);
    
    if (discountedPrice === 0) return 'FREE';
    return `€${discountedPrice.toFixed(0)}`;
  };

  const plans = [
    {
      name: "Free",
      price: "€0",
      period: "/month",
      description: "Perfect for getting started",
      features: [
        "2 AI language models",
        "30 AI tokens per week",
        "45-minute meetings",
        "100GB file storage",
        "Basic support"
      ],
      icon: Sparkles,
      plan: "free" as const,
      current: plan === "free",
    },
    {
      name: "Advanced",
      originalPrice: tiers.advanced.price,
      price: getDiscountedPrice(tiers.advanced.price),
      period: "/month",
      description: "For growing teams",
      features: [
        "5 AI language models",
        "50 AI tokens per week",
        "Local AI execution",
        "90-minute meetings",
        "1TB file storage",
        "Priority support"
      ],
      icon: Zap,
      plan: "advanced" as const,
      current: plan === "advanced",
      priceId: tiers.advanced.priceId,
    },
    {
      name: "Professional",
      originalPrice: tiers.professional.price,
      price: getDiscountedPrice(tiers.professional.price),
      period: "/month",
      description: "For power users",
      features: [
        "9 AI language models",
        "Unlimited AI tokens",
        "Local AI execution",
        "Image generation",
        "Unlimited meetings",
        "10TB file storage",
        "24/7 premium support"
      ],
      icon: Crown,
      plan: "professional" as const,
      current: plan === "professional",
      priceId: tiers.professional.priceId,
    },
  ];

  const handleUpgrade = async (planType: 'advanced' | 'professional') => {
    // If 100% off promo code, activate directly without Stripe
    if (validPromoCode?.discount_percent === 100) {
      setActivating(true);
      try {
        const { data, error } = await supabase.functions.invoke('activate-free-subscription', {
          body: { 
            planType,
            promoCodeId: validPromoCode.id
          },
        });
        
        if (error) throw error;
        
        if (data?.success) {
          toast.success(data.message || `${planType} plan activated!`);
          clearPromoCode();
          await checkSubscription();
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to activate subscription');
      } finally {
        setActivating(false);
      }
      return;
    }

    // Normal Stripe checkout flow
    const priceId = tiers[planType].priceId;
    
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { 
        priceId,
        promoCodeId: validPromoCode?.id,
        stripeCouponId: validPromoCode?.stripeCouponId
      },
    });
    
    if (error) {
      toast.error('Failed to create checkout session');
      return;
    }
    
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  const handleValidatePromo = async () => {
    await validatePromoCode(promoCodeInput);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
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
                    <li>• Storage: {limits.fileStorageGB === 0 ? 'Unlimited' : limits.fileStorageGB >= 1024 ? `${limits.fileStorageGB / 1024}TB` : `${limits.fileStorageGB}GB`}</li>
                  </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Promo Code Section */}
        {!subscribed && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Have a Promo Code?
              </CardTitle>
              <CardDescription>
                Enter your promotional code to get a discount on your subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validPromoCode ? (
                <div className="p-4 bg-primary/10 border border-primary rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground">Promo code applied!</p>
                    <Button variant="ghost" size="sm" onClick={clearPromoCode}>
                      Remove
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {validPromoCode.discount_percent === 100 ? (
                      <strong>100% off - FREE lifetime subscription!</strong>
                    ) : (
                      <>
                        <strong>{validPromoCode.discount_percent}% off</strong> for {validPromoCode.duration_months} months
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="promoCode" className="sr-only">Promo Code</Label>
                    <Input
                      id="promoCode"
                      placeholder="Enter promo code"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                  </div>
                  <Button onClick={handleValidatePromo} disabled={validating}>
                    {validating ? 'Validating...' : 'Apply'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((planOption) => {
            const Icon = planOption.icon;
            const hasDiscount = validPromoCode && planOption.plan !== 'free' && planOption.originalPrice !== planOption.price;
            
            return (
              <Card 
                key={planOption.name} 
                className={cn(
                  "flex flex-col",
                  planOption.current ? "border-primary shadow-lg" : ""
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className="h-8 w-8 text-primary" />
                    {planOption.current && (
                      <Badge variant="default">Current Plan</Badge>
                    )}
                    {hasDiscount && !planOption.current && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                        {validPromoCode?.discount_percent}% OFF
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{planOption.name}</CardTitle>
                  <CardDescription>{planOption.description}</CardDescription>
                  <div className="mt-4">
                    {hasDiscount ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-foreground">{planOption.price}</span>
                        <span className="text-lg line-through text-muted-foreground">{planOption.originalPrice}</span>
                        <span className="text-muted-foreground">{planOption.price === 'FREE' ? '' : planOption.period}</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-foreground">{planOption.price}</span>
                        <span className="text-muted-foreground">{planOption.period}</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1 mb-4">
                    {planOption.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div>
                    {!planOption.current && planOption.plan !== 'free' && (
                      <Button 
                        className="w-full" 
                        onClick={() => handleUpgrade(planOption.plan as 'advanced' | 'professional')}
                        disabled={activating}
                      >
                        {activating ? 'Activating...' : `Upgrade to ${planOption.name}`}
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Subscription;