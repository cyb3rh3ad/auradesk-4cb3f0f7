import { useAIPreferences } from '@/hooks/useAIPreferences';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocalAI } from '@/hooks/useLocalAI';
import { useOllamaAI, RECOMMENDED_OLLAMA_MODELS } from '@/hooks/useOllamaAI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Settings, Cloud, Cpu, Lock, Sparkles, Zap, Brain, Image, Server, RefreshCw, Download, Check, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { AI_MODELS, getAvailableModels, canUseLocalExecution, getModelById } from '@/lib/ai-models';
import { isElectron } from '@/lib/supabase-config';
import { cn } from '@/lib/utils';

const AISettings = () => {
  const { preferences, loading, updatePreferences } = useAIPreferences();
  const { plan } = useSubscription();
  const localAI = useLocalAI();
  const ollamaAI = useOllamaAI();
  
  const availableModels = getAvailableModels(plan);
  const canUseLocal = canUseLocalExecution(plan);
  const selectedModel = getModelById(preferences?.selected_model || 'gemini-flash-lite');
  const webGPUSupported = localAI.isWebGPUSupported();
  const inElectron = isElectron();

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'free':
        return <Badge variant="secondary">Free</Badge>;
      case 'advanced':
        return <Badge className="bg-blue-500">Advanced</Badge>;
      case 'professional':
        return <Badge className="bg-purple-500">Pro</Badge>;
      default:
        return null;
    }
  };

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'text':
        return <Sparkles className="w-3 h-3" />;
      case 'image':
        return <Image className="w-3 h-3" />;
      case 'reasoning':
        return <Brain className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handlePullModel = async (modelName: string) => {
    await ollamaAI.pullModel(modelName, (status) => {
      console.log('Pull status:', status);
    });
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-6 overflow-y-auto overflow-x-hidden">
      <div className="mb-4 md:mb-6">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 md:w-8 md:h-8" />
          AI Settings
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">Configure AI models and execution preferences</p>
      </div>

      <div className="space-y-4 md:space-y-6 max-w-3xl pb-6">
        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Model
            </CardTitle>
            <CardDescription>
              Choose which AI model to use for chat and assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {AI_MODELS.map((model) => {
                const isAvailable = availableModels.some(m => m.id === model.id);
                const isSelected = preferences.selected_model === model.id;
                
                return (
                  <div
                    key={model.id}
                    onClick={() => isAvailable && updatePreferences({ selected_model: model.id })}
                    className={cn(
                      "relative flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                      isSelected && "border-primary bg-primary/5",
                      !isSelected && isAvailable && "border-border hover:border-primary/50 cursor-pointer",
                      !isAvailable && "border-border/50 opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{model.name}</span>
                        {getTierBadge(model.tier)}
                        {model.supportsLocal && (
                          <Badge variant="outline" className="text-xs">
                            <Cpu className="w-3 h-3 mr-1" />
                            Local
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{model.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {model.capabilities.map(cap => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {getCapabilityIcon(cap)}
                            <span className="ml-1 capitalize">{cap}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {!isAvailable && (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                    
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Execution Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Execution Mode
            </CardTitle>
            <CardDescription>
              Choose where AI processing happens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canUseLocal && !inElectron && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <Lock className="w-4 h-4 inline mr-2" />
                Local execution is available for Advanced and Professional subscribers
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div
                onClick={() => updatePreferences({ execution_mode: 'cloud' })}
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all",
                  preferences.execution_mode === 'cloud' && "border-primary bg-primary/5",
                  preferences.execution_mode !== 'cloud' && "border-border hover:border-primary/50"
                )}
              >
                <Cloud className="w-8 h-8 mb-2 text-blue-500" />
                <h4 className="font-medium">Cloud</h4>
                <p className="text-sm text-muted-foreground">
                  Fast, powerful servers
                </p>
              </div>
              
              {inElectron ? (
                <div
                  onClick={() => updatePreferences({ execution_mode: 'ollama' })}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    preferences.execution_mode === 'ollama' && "border-primary bg-primary/5",
                    preferences.execution_mode !== 'ollama' && "border-border hover:border-primary/50"
                  )}
                >
                  <Server className="w-8 h-8 mb-2 text-orange-500" />
                  <h4 className="font-medium flex items-center gap-2">
                    Ollama
                    {ollamaAI.isConnected ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Offline AI, no internet
                  </p>
                </div>
              ) : (
                <div
                  onClick={() => canUseLocal && selectedModel?.supportsLocal && updatePreferences({ execution_mode: 'local' })}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    preferences.execution_mode === 'local' && "border-primary bg-primary/5",
                    preferences.execution_mode !== 'local' && canUseLocal && selectedModel?.supportsLocal && "border-border hover:border-primary/50 cursor-pointer",
                    (!canUseLocal || !selectedModel?.supportsLocal) && "border-border/50 opacity-60 cursor-not-allowed"
                  )}
                >
                  <Cpu className="w-8 h-8 mb-2 text-green-500" />
                  <h4 className="font-medium">Local</h4>
                  <p className="text-sm text-muted-foreground">
                    Run AI on your device
                  </p>
                  {!webGPUSupported && canUseLocal && (
                    <p className="text-xs text-destructive mt-1">
                      WebGPU not supported
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {localAI.isModelLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Loading local model...</span>
                  <span>{localAI.loadingProgress}%</span>
                </div>
                <Progress value={localAI.loadingProgress} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ollama Configuration - Only show in Electron */}
        {inElectron && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Ollama Configuration
                {ollamaAI.isConnected ? (
                  <Badge className="bg-green-500 ml-auto">Connected</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-auto">Disconnected</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Run AI models locally without internet connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  {ollamaAI.isConnected ? (
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {ollamaAI.isConnected ? 'Ollama Running' : 'Ollama Not Running'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ollamaAI.isConnected 
                        ? `${ollamaAI.availableModels.length} models available`
                        : 'Start Ollama to use offline AI'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => ollamaAI.checkConnection()}
                    disabled={ollamaAI.isCheckingConnection}
                  >
                    {ollamaAI.isCheckingConnection ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <a
                    href="https://ollama.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    Get Ollama
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Installed Models */}
              {ollamaAI.isConnected && ollamaAI.availableModels.length > 0 && (
                <div className="space-y-2">
                  <Label>Installed Models</Label>
                  <div className="grid gap-2">
                    {ollamaAI.availableModels.map((model) => (
                      <div
                        key={model.name}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div>
                          <p className="font-medium text-sm">{model.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ollamaAI.formatModelSize(model.size)}
                          </p>
                        </div>
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Models to Download */}
              {ollamaAI.isConnected && (
                <div className="space-y-2">
                  <Label>Recommended Models</Label>
                  <p className="text-xs text-muted-foreground">
                    Click to download a model for offline use
                  </p>
                  <div className="grid gap-2">
                    {RECOMMENDED_OLLAMA_MODELS.map((model) => {
                      const isInstalled = ollamaAI.availableModels.some(
                        m => m.name.startsWith(model.name.split(':')[0])
                      );
                      
                      return (
                        <div
                          key={model.name}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                            isInstalled ? "bg-muted/50" : "hover:bg-muted/50 cursor-pointer"
                          )}
                          onClick={() => !isInstalled && !ollamaAI.isLoading && handlePullModel(model.name)}
                        >
                          <div>
                            <p className="font-medium text-sm">{model.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {model.description} • {model.size}
                            </p>
                          </div>
                          {isInstalled ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : ollamaAI.isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {ollamaAI.error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {ollamaAI.error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transcript Processing */}
        <Card>
          <CardHeader>
            <CardTitle>Default Transcript Processing</CardTitle>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <Card>
          <CardHeader>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>
              Enable background AI features
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

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h4 className="font-medium">About AI Models</h4>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">Free</Badge>
                  <span>Basic models for everyday tasks</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge className="bg-blue-500 mt-0.5">Advanced</Badge>
                  <span>Better models + local execution option</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge className="bg-purple-500 mt-0.5">Pro</Badge>
                  <span>All models including image generation and advanced reasoning</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AISettings;
