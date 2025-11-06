import { useAIPreferences } from '@/hooks/useAIPreferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Settings } from 'lucide-react';

const AISettings = () => {
  const { preferences, loading, updatePreferences } = useAIPreferences();

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          AI Settings
        </h2>
        <p className="text-muted-foreground">Configure how AI processes your meeting transcripts</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Default Processing Type</CardTitle>
            <CardDescription>
              Choose how meeting transcripts should be processed by default
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="processing-type">Processing Type</Label>
              <Select
                value={preferences.default_processing_type}
                onValueChange={(value: any) => updatePreferences({ default_processing_type: value })}
              >
                <SelectTrigger id="processing-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Transcript Only</SelectItem>
                  <SelectItem value="summary">Generate Summary</SelectItem>
                  <SelectItem value="bullet_points">Convert to Bullet Points</SelectItem>
                  <SelectItem value="custom">Custom Instructions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preferences.default_processing_type === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="custom-instructions">Custom Instructions</Label>
                <Textarea
                  id="custom-instructions"
                  value={preferences.custom_instructions || ''}
                  onChange={(e) => updatePreferences({ custom_instructions: e.target.value })}
                  placeholder="Describe how you want the AI to process your transcripts..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Example: "Create a summary with action items highlighted, then list key decisions made"
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>
              Enable the AI assistant to help you analyze meetings and provide recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="assistant-toggle">Enable Background Assistant</Label>
                <p className="text-sm text-muted-foreground">
                  AI will track your meetings and provide insights when requested
                </p>
              </div>
              <Switch
                id="assistant-toggle"
                checked={preferences.enable_background_assistant}
                onCheckedChange={(checked) => updatePreferences({ enable_background_assistant: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h4 className="font-medium">About AI Processing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Full Transcript:</strong> Stores the complete transcription without processing</li>
                <li>• <strong>Summary:</strong> AI generates a concise summary of key points and decisions</li>
                <li>• <strong>Bullet Points:</strong> AI organizes content into clear, categorized bullet points</li>
                <li>• <strong>Custom:</strong> Define your own instructions for how AI should process transcripts</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AISettings;