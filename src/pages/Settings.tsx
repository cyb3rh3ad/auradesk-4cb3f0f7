import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveSelect,
  ResponsiveSelectContent,
  ResponsiveSelectItem,
  ResponsiveSelectTrigger,
  ResponsiveSelectValue,
} from '@/components/ui/responsive-select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Palette, Lock, Mic, Camera, Volume2, User, Users, Upload, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { usePresenceContext } from '@/contexts/PresenceContext';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { myStatus, setDoNotDisturb } = usePresenceContext();
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  // Profile settings
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [customStatus, setCustomStatus] = useState('');

  // Appearance settings
  const [theme, setTheme] = useState('light');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio/Video settings
  const [selectedMic, setSelectedMic] = useState('default');
  const [selectedCamera, setSelectedCamera] = useState('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState('default');
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);

  // Nicknames
  const [nicknames, setNicknames] = useState<any[]>([]);
  const [newNicknameUser, setNewNicknameUser] = useState('');
  const [newNickname, setNewNickname] = useState('');

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadNicknames();
      loadMediaDevices();
    }
  }, [user]);

  const loadMediaDevices = async () => {
    try {
      // Request permission to access media devices to get labels
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach(track => track.stop());
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
      setVideoInputDevices(devices.filter(d => d.kind === 'videoinput'));
    } catch (error) {
      console.error('Error loading media devices:', error);
      // Try to enumerate without permission (labels will be empty)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
        setVideoInputDevices(devices.filter(d => d.kind === 'videoinput'));
      } catch (e) {
        console.error('Error enumerating devices:', e);
      }
    }
  };

  const loadUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (data) {
      setFullName(data.full_name || '');
      setUsername(data.username || '');
      setCustomStatus(data.custom_status || '');
      setTheme(data.theme || 'light');
      setBackgroundImage(data.background_image || '');
      setAvatarUrl(data.avatar_url || '');
    }
  };

  const loadNicknames = async () => {
    const { data } = await supabase
      .from('nicknames')
      .select('*, profiles!nicknames_target_user_id_fkey(username, full_name)')
      .eq('user_id', user?.id);

    if (data) {
      setNicknames(data);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        username: username,
        custom_status: customStatus,
      })
      .eq('id', user?.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    }

    setLoading(false);
  };

  const handleUpdateAppearance = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        theme: theme,
        background_image: backgroundImage,
      })
      .eq('id', user?.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Appearance updated',
        description: 'Your appearance settings have been saved.',
      });
      
      // Apply theme
      applyTheme(theme);
    }

    setLoading(false);
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      });
    }

    setLoading(false);
  };

  const handleAddNickname = async () => {
    if (!newNicknameUser || !newNickname) return;

    setLoading(true);

    // Search for user
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', newNicknameUser)
      .single();

    if (!profiles) {
      toast({
        title: 'User not found',
        description: 'Could not find a user with that username.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('nicknames')
      .insert({
        user_id: user?.id,
        target_user_id: profiles.id,
        nickname: newNickname,
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Nickname added',
        description: 'The nickname has been saved.',
      });
      setNewNicknameUser('');
      setNewNickname('');
      loadNicknames();
    }

    setLoading(false);
  };

  const handleDeleteNickname = async (id: string) => {
    const { error } = await supabase
      .from('nicknames')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Nickname deleted',
        description: 'The nickname has been removed.',
      });
      loadNicknames();
    }
  };

  const applyTheme = (themeName: string) => {
    // Remove all theme classes
    document.documentElement.classList.remove(
      'dark',
      'theme-discord-dark',
      'theme-midnight',
      'theme-forest',
      'theme-sunset',
      'theme-purple'
    );

    // Apply selected theme
    if (themeName !== 'light') {
      document.documentElement.classList.add(themeName);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto h-full pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">Customize your AuraDesk experience</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <div className="relative">
          {isMobile && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
          )}
          <TabsList className={cn(
            "w-full gap-1 md:gap-1.5 bg-muted/50 p-1 rounded-lg",
            isMobile 
              ? "flex overflow-x-auto justify-start scrollbar-hide scroll-smooth" 
              : "grid grid-cols-5"
          )}>
            <TabsTrigger value="profile" className={cn(
              "gap-1.5 md:gap-2 min-h-[40px] md:min-h-[44px] transition-all rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm",
              isMobile && "shrink-0 px-3 min-w-[48px] active:scale-95"
            )}>
              <User className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline text-sm">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className={cn(
              "gap-1.5 md:gap-2 min-h-[40px] md:min-h-[44px] transition-all rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm",
              isMobile && "shrink-0 px-3 min-w-[48px] active:scale-95"
            )}>
              <Palette className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline text-sm">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="security" className={cn(
              "gap-1.5 md:gap-2 min-h-[40px] md:min-h-[44px] transition-all rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm",
              isMobile && "shrink-0 px-3 min-w-[48px] active:scale-95"
            )}>
              <Lock className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline text-sm">Security</span>
            </TabsTrigger>
            <TabsTrigger value="audio-video" className={cn(
              "gap-1.5 md:gap-2 min-h-[40px] md:min-h-[44px] transition-all rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm",
              isMobile && "shrink-0 px-3 min-w-[48px] active:scale-95"
            )}>
              <Mic className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline text-sm">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="nicknames" className={cn(
              "gap-1.5 md:gap-2 min-h-[40px] md:min-h-[44px] transition-all rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm",
              isMobile && "shrink-0 px-3 min-w-[48px] active:scale-95"
            )}>
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline text-sm">Nicknames</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Avatar'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Max 5MB • PNG, JPG, WEBP, GIF
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="fullname">Full Name</Label>
                <Input
                  id="fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  pattern="[a-zA-Z0-9_]{3,20}"
                />
                <p className="text-xs text-muted-foreground">
                  3-20 characters: letters, numbers, and underscores only
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Custom Status</Label>
                <Input
                  id="status"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="What's on your mind?"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="dnd" className="flex items-center gap-2">
                    <BellOff className="w-4 h-4" />
                    Do Not Disturb
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, you won't receive message or call notifications
                  </p>
                </div>
                <Switch
                  id="dnd"
                  checked={myStatus === 'dnd'}
                  onCheckedChange={(checked) => setDoNotDisturb(checked)}
                />
              </div>
              <Separator />
              <Button onClick={handleUpdateProfile} disabled={loading}>
                Save Profile Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how AuraDesk looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Color Theme</Label>
                <ResponsiveSelect value={theme} onValueChange={setTheme}>
                  <ResponsiveSelectTrigger>
                    <ResponsiveSelectValue />
                  </ResponsiveSelectTrigger>
                  <ResponsiveSelectContent title="Select Theme">
                    <ResponsiveSelectItem value="light">Light</ResponsiveSelectItem>
                    <ResponsiveSelectItem value="dark">Dark (Default)</ResponsiveSelectItem>
                    <ResponsiveSelectItem value="theme-discord-dark">Discord Dark</ResponsiveSelectItem>
                    <ResponsiveSelectItem value="theme-midnight">Midnight Blue</ResponsiveSelectItem>
                    <ResponsiveSelectItem value="theme-forest">Forest</ResponsiveSelectItem>
                    <ResponsiveSelectItem value="theme-sunset">Sunset</ResponsiveSelectItem>
                    <ResponsiveSelectItem value="theme-purple">Purple Dream</ResponsiveSelectItem>
                  </ResponsiveSelectContent>
                </ResponsiveSelect>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred color scheme
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="background">Background Image URL</Label>
                <Input
                  id="background"
                  value={backgroundImage}
                  onChange={(e) => setBackgroundImage(e.target.value)}
                  placeholder="Enter image URL for custom background"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for default background
                </p>
              </div>
              <Separator />
              <Button onClick={handleUpdateAppearance} disabled={loading}>
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PasswordChangeForm onSubmit={handleChangePassword} loading={loading} />
            </CardContent>
          </Card>
          
          <TwoFactorAuth />
        </TabsContent>

        <TabsContent value="audio-video" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice & Video Settings</CardTitle>
              <CardDescription>Configure your audio and video devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="microphone" className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Microphone
                </Label>
                <ResponsiveSelect value={selectedMic} onValueChange={setSelectedMic}>
                  <ResponsiveSelectTrigger>
                    <ResponsiveSelectValue placeholder="Select microphone" />
                  </ResponsiveSelectTrigger>
                  <ResponsiveSelectContent title="Select Microphone">
                    <ResponsiveSelectItem value="default">Default Microphone</ResponsiveSelectItem>
                    {audioInputDevices
                      .filter(device => device.deviceId && device.deviceId !== '')
                      .map(device => (
                        <ResponsiveSelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </ResponsiveSelectItem>
                      ))}
                  </ResponsiveSelectContent>
                </ResponsiveSelect>
                {audioInputDevices.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Grant microphone permission to see available devices
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="camera" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Camera
                </Label>
                <ResponsiveSelect value={selectedCamera} onValueChange={setSelectedCamera}>
                  <ResponsiveSelectTrigger>
                    <ResponsiveSelectValue placeholder="Select camera" />
                  </ResponsiveSelectTrigger>
                  <ResponsiveSelectContent title="Select Camera">
                    <ResponsiveSelectItem value="default">Default Camera</ResponsiveSelectItem>
                    {videoInputDevices
                      .filter(device => device.deviceId && device.deviceId !== '')
                      .map(device => (
                        <ResponsiveSelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </ResponsiveSelectItem>
                      ))}
                  </ResponsiveSelectContent>
                </ResponsiveSelect>
                {videoInputDevices.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Grant camera permission to see available devices
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="speaker" className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Speaker/Output
                </Label>
                <ResponsiveSelect value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                  <ResponsiveSelectTrigger>
                    <ResponsiveSelectValue placeholder="Select speaker" />
                  </ResponsiveSelectTrigger>
                  <ResponsiveSelectContent title="Select Speaker">
                    <ResponsiveSelectItem value="default">Default Speaker</ResponsiveSelectItem>
                    {audioOutputDevices
                      .filter(device => device.deviceId && device.deviceId !== '')
                      .map(device => (
                        <ResponsiveSelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                        </ResponsiveSelectItem>
                      ))}
                  </ResponsiveSelectContent>
                </ResponsiveSelect>
                {audioOutputDevices.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Grant audio permission to see available devices
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Noise Suppression</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce background noise during calls
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Echo Cancellation</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent audio feedback during calls
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Gain Control</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically adjust microphone volume
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nicknames" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nicknames</CardTitle>
              <CardDescription>Set custom nicknames for your friends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Username"
                    value={newNicknameUser}
                    onChange={(e) => setNewNicknameUser(e.target.value)}
                  />
                  <Input
                    placeholder="Nickname"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                  />
                  <Button onClick={handleAddNickname} disabled={loading}>
                    Add
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  {nicknames.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No nicknames set yet
                    </p>
                  ) : (
                    nicknames.map((nick) => (
                      <div
                        key={nick.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{nick.nickname}</p>
                          <p className="text-sm text-muted-foreground">
                            @{nick.profiles?.username || 'Unknown user'}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteNickname(nick.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const PasswordChangeForm = ({ onSubmit, loading }: { onSubmit: (current: string, newPass: string) => void; loading: boolean }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    onSubmit(currentPassword, newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Current Password</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <Separator />
      <Button type="submit" disabled={loading}>
        Change Password
      </Button>
    </form>
  );
};

export default Settings;
