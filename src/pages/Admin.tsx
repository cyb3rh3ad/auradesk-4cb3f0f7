import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, Users, Calendar, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  duration_months: number;
  max_uses: number | null;
  current_uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

const Admin = () => {
  const { isOwner, loading: roleLoading } = useUserRole();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(20);
  const [maxUsers, setMaxUsers] = useState<number | ''>(100);
  const [durationMonths, setDurationMonths] = useState<number | null>(12);
  const [applicablePlans, setApplicablePlans] = useState<string[]>(['advanced', 'professional']);

  const durationOptions = [
    { label: 'Permanent', value: null },
    { label: '2 Years', value: 24 },
    { label: '1 Year', value: 12 },
    { label: '6 Months', value: 6 },
  ];

  // Calculate expiry date based on duration
  const getExpiryDate = () => {
    if (durationMonths === null) return null;
    const date = new Date();
    date.setMonth(date.getMonth() + durationMonths);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isOwner) {
      fetchPromoCodes();
    }
  }, [isOwner]);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const createPromoCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    if (discountPercent < 1 || discountPercent > 100) {
      toast.error('Discount must be between 1 and 100');
      return;
    }

    setCreating(true);
    try {
      const expiryDate = getExpiryDate();
      
      const { error } = await supabase
        .from('promo_codes')
        .insert({
          code: code.toUpperCase().trim(),
          discount_percent: discountPercent,
          duration_months: durationMonths || 0,
          max_uses: maxUsers === '' ? null : maxUsers,
          expires_at: expiryDate,
          applicable_plans: applicablePlans,
        });

      if (error) throw error;

      const durationLabel = durationMonths === null ? 'permanently' : `for ${durationMonths} months`;
      toast.success(`Promo code created! ${discountPercent}% off ${durationLabel}`);
      setCode('');
      setDiscountPercent(20);
      setMaxUsers(100);
      setDurationMonths(12);
      setApplicablePlans(['advanced', 'professional']);
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error creating promo code:', error);
      if (error.code === '23505') {
        toast.error('This promo code already exists');
      } else {
        toast.error('Failed to create promo code');
      }
    } finally {
      setCreating(false);
    }
  };

  const togglePromoCode = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Promo code ${currentActive ? 'deactivated' : 'activated'}`);
      fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling promo code:', error);
      toast.error('Failed to update promo code');
    }
  };

  const deletePromoCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Promo code deleted');
      fetchPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast.error('Failed to delete promo code');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage promo codes and promotions</p>
        </div>

        {/* Create Promo Code */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Promo Code Creator
            </CardTitle>
            <CardDescription>
              Create discount codes with smart defaults - 1 year duration, auto-expiry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="code">
                  Code Name <span className="text-muted-foreground text-xs">(e.g., WELCOME20, SUMMER50)</span>
                </Label>
                <Input
                  id="code"
                  placeholder="WELCOME20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">
                  Discount Percentage
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="discount"
                    type="number"
                    min="1"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <span className="text-2xl font-bold text-primary">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Applied to monthly subscription</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">
                  Max Users
                </Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value ? parseInt(e.target.value) : '')}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">How many users can redeem this code</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <select
                  value={durationMonths === null ? 'null' : durationMonths.toString()}
                  onChange={(e) => setDurationMonths(e.target.value === 'null' ? null : parseInt(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                >
                  {durationOptions.map((opt) => (
                    <option key={opt.label} value={opt.value === null ? 'null' : opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">How long the discount lasts</p>
              </div>
              <div className="space-y-2">
                <Label>Applicable Plans</Label>
                <div className="flex flex-col gap-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applicablePlans.includes('advanced')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setApplicablePlans([...applicablePlans, 'advanced']);
                        } else {
                          setApplicablePlans(applicablePlans.filter(p => p !== 'advanced'));
                        }
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">Advanced (€5/mo)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applicablePlans.includes('professional')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setApplicablePlans([...applicablePlans, 'professional']);
                        } else {
                          setApplicablePlans(applicablePlans.filter(p => p !== 'professional'));
                        }
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">Professional (€12/mo)</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Summary:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Duration: {durationMonths === null ? 'Permanent' : `${durationMonths} months`}</li>
                <li>✓ Expires: {durationMonths === null ? 'Never' : new Date(Date.now() + (durationMonths * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString()}</li>
                <li>✓ Applies to: {applicablePlans.length === 0 ? 'None selected' : applicablePlans.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' & ')} plan{applicablePlans.length > 1 ? 's' : ''}</li>
              </ul>
            </div>

            <Button onClick={createPromoCode} disabled={creating} className="w-full" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Promo Code'}
            </Button>
          </CardContent>
        </Card>

        {/* Promo Codes List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Promo Codes</CardTitle>
            <CardDescription>Manage existing promotional codes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading promo codes...</p>
            ) : promoCodes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No promo codes created yet</p>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {promoCodes.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between p-3 md:p-4 border rounded-lg bg-card"
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-base md:text-lg font-bold break-all">{promo.code}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => copyToClipboard(promo.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!promo.active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3 md:h-4 md:w-4" />
                          {promo.discount_percent}% off
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                          {promo.duration_months} mo
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 md:h-4 md:w-4" />
                          {promo.current_uses}/{promo.max_uses || '∞'}
                        </span>
                      </div>
                      {promo.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(promo.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Switch
                        checked={promo.active}
                        onCheckedChange={() => togglePromoCode(promo.id, promo.active)}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-9 w-9 p-0"
                        onClick={() => deletePromoCode(promo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
