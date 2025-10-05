import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Mod {
  id: string;
  name: string;
  description: string;
  loader: string;
  version: string;
  date: string;
  status: 'ready' | 'generating';
}

const Index = () => {
  const [activeTab, setActiveTab] = useState('generator');
  const [modDescription, setModDescription] = useState('');
  const [modLoader, setModLoader] = useState('forge');
  const [mcVersion, setMcVersion] = useState('1.20.1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentModId, setCurrentModId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [mods, setMods] = useState<Mod[]>([
    {
      id: '1',
      name: 'Enhanced Tools Mod',
      description: 'Добавляет улучшенные инструменты с увеличенной прочностью',
      loader: 'Forge',
      version: '1.20.1',
      date: '2025-10-01',
      status: 'ready'
    }
  ]);

  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([
    { role: 'ai', content: 'Привет! Я помогу обновить твой мод. Опиши, что хочешь изменить.' }
  ]);

  const mcVersions = [
    '1.21.7', '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.19.2', 
    '1.18.2', '1.17.1', '1.16.5', '1.15.2', '1.14.4', '1.12.2', '1.10.2', '1.8.9', '1.7.10'
  ];

  const handleGenerateMod = () => {
    if (!modDescription.trim()) {
      toast.error('Опиши, какой мод ты хочешь создать');
      return;
    }

    setIsGenerating(true);
    toast.loading('Генерирую мод...', { id: 'generating' });

    setTimeout(() => {
      const newMod: Mod = {
        id: Date.now().toString(),
        name: modDescription.slice(0, 30) + '...',
        description: modDescription,
        loader: modLoader === 'forge' ? 'Forge' : 'Fabric',
        version: mcVersion,
        date: new Date().toISOString().split('T')[0],
        status: 'ready'
      };

      setMods([newMod, ...mods]);
      setIsGenerating(false);
      setCurrentModId(newMod.id);
      toast.success('Мод готов к скачиванию!', { id: 'generating' });
      setModDescription('');
    }, 3000);
  };

  const handleDownloadMod = (modId: string) => {
    toast.success('Скачивание началось!');
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    if (!currentModId) {
      toast.error('Сначала создай мод');
      return;
    }

    setChatMessages([...chatMessages, { role: 'user', content: chatMessage }]);
    setChatMessage('');

    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Отлично! Я обновлю твой мод. Через минуту будет готова новая версия для скачивания.' 
      }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary pixel-border flex items-center justify-center text-4xl">
              🎮
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ 
              textShadow: '4px 4px 0px rgba(0,0,0,0.3)' 
            }}>
              MINECRAFT MOD GENERATOR
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Создавай моды любой сложности через AI — от блоков до серверных команд
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-14 pixel-border bg-card">
            <TabsTrigger value="generator" className="text-base pixel-button data-[state=active]:bg-primary">
              <Icon name="Cpu" className="mr-2" size={20} />
              Генератор
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-base pixel-button data-[state=active]:bg-primary">
              <Icon name="MessageSquare" className="mr-2" size={20} />
              Чат
            </TabsTrigger>
            <TabsTrigger value="history" className="text-base pixel-button data-[state=active]:bg-primary">
              <Icon name="History" className="mr-2" size={20} />
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            <Card className="pixel-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Wrench" size={24} />
                  Создать новый мод
                </CardTitle>
                <CardDescription>
                  Опиши, какой мод ты хочешь — AI создаст все файлы автоматически
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Icon name="Box" size={16} />
                      Загрузчик модов
                    </label>
                    <Select value={modLoader} onValueChange={setModLoader}>
                      <SelectTrigger className="pixel-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="pixel-border">
                        <SelectItem value="forge">Forge</SelectItem>
                        <SelectItem value="fabric">Fabric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Icon name="Calendar" size={16} />
                      Версия Minecraft
                    </label>
                    <Select value={mcVersion} onValueChange={setMcVersion}>
                      <SelectTrigger className="pixel-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="pixel-border max-h-60">
                        {mcVersions.map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Icon name="FileText" size={16} />
                    Описание мода
                  </label>
                  <Textarea 
                    placeholder="Например: Добавь изумрудный меч с прочностью 3000 и уроном 12. Меч должен светиться в темноте."
                    value={modDescription}
                    onChange={(e) => setModDescription(e.target.value)}
                    className="min-h-32 pixel-border resize-none"
                    disabled={isGenerating}
                  />
                </div>

                <Button 
                  onClick={handleGenerateMod}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full pixel-button pixel-border bg-primary hover:bg-primary/90 text-lg h-14"
                >
                  {isGenerating ? (
                    <>
                      <Icon name="Loader2" className="mr-2 animate-spin" size={20} />
                      Генерирую мод...
                    </>
                  ) : (
                    <>
                      <Icon name="Sparkles" className="mr-2" size={20} />
                      Сгенерировать мод
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="pixel-border bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon name="Info" size={20} />
                  Возможности генератора
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Добавление предметов, блоков, существ</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>AI-генерация текстур</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Кастомные команды для серверов</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Готовый Gradle-проект</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <Card className="pixel-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="MessagesSquare" size={24} />
                  Обновление мода
                </CardTitle>
                <CardDescription>
                  {currentModId 
                    ? `Редактируешь: ${mods.find(m => m.id === currentModId)?.name}`
                    : 'Сначала создай мод в разделе "Генератор"'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-96 pixel-border bg-muted/20 p-4 rounded">
                  <div className="space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 pixel-border ${
                          msg.role === 'user' ? 'bg-primary' : 'bg-card'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon name={msg.role === 'user' ? 'User' : 'Bot'} size={16} />
                            <span className="text-xs opacity-70">
                              {msg.role === 'user' ? 'Ты' : 'AI'}
                            </span>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Добавь зачарование, которое восстанавливает HP..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="pixel-border resize-none"
                    rows={3}
                    disabled={!currentModId}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!currentModId}
                    className="pixel-button pixel-border bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    <Icon name="Send" size={20} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="pixel-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Archive" size={24} />
                  Твои моды
                </CardTitle>
                <CardDescription>
                  Все созданные моды можно скачать повторно
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {mods.map((mod) => (
                      <Card key={mod.id} className="pixel-border bg-card/50">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Icon name="Package" size={20} className="text-primary" />
                                <h3 className="font-semibold">{mod.name}</h3>
                                <Badge variant="outline" className="pixel-border">
                                  {mod.loader}
                                </Badge>
                                <Badge variant="secondary" className="pixel-border">
                                  v{mod.version}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {mod.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Создан: {mod.date}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => {
                                  setCurrentModId(mod.id);
                                  setActiveTab('chat');
                                }}
                                variant="outline"
                                className="pixel-button pixel-border"
                              >
                                <Icon name="Edit" size={16} className="mr-2" />
                                Редактировать
                              </Button>
                              <Button 
                                onClick={() => handleDownloadMod(mod.id)}
                                className="pixel-button pixel-border bg-primary hover:bg-primary/90"
                              >
                                <Icon name="Download" size={16} className="mr-2" />
                                Скачать
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
