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
import JSZip from 'jszip';

interface Mod {
  id: string;
  name: string;
  description: string;
  loader: string;
  version: string;
  date: string;
  status: 'ready' | 'generating';
  modData?: any;
}

const API_URLS = {
  generateMod: 'https://functions.poehali.dev/8b482340-a936-48f2-ba7c-290c361fc9f8',
  chatMod: 'https://functions.poehali.dev/85709466-8e64-4644-a7d0-242549380bd8',
  portMod: 'https://functions.poehali.dev/7e44d2c4-b68b-4e11-a017-48c1eafcf57d'
};

const Index = () => {
  const [activeTab, setActiveTab] = useState('generator');
  const [selectedJar, setSelectedJar] = useState<File | null>(null);
  const [portVersion, setPortVersion] = useState('1.20.1');
  const [portLoader, setPortLoader] = useState('forge');
  const [isPorting, setIsPorting] = useState(false);
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

  const handleGenerateMod = async () => {
    if (!modDescription.trim()) {
      toast.error('Опиши, какой мод ты хочешь создать');
      return;
    }

    setIsGenerating(true);
    toast.loading('AI генерирует твой мод...', { id: 'generating' });

    try {
      const response = await fetch(API_URLS.generateMod, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: modDescription,
          loader: modLoader,
          version: mcVersion
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка генерации');
      }

      const newMod: Mod = {
        id: data.modId,
        name: data.modData.modName || modDescription.slice(0, 30),
        description: modDescription,
        loader: modLoader === 'forge' ? 'Forge' : 'Fabric',
        version: mcVersion,
        date: new Date().toISOString().split('T')[0],
        status: 'ready',
        modData: data.modData
      };

      setMods([newMod, ...mods]);
      setCurrentModId(newMod.id);
      toast.success('Мод готов к скачиванию!', { id: 'generating' });
      setModDescription('');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось сгенерировать мод', { id: 'generating' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadMod = async (modId: string) => {
    const mod = mods.find(m => m.id === modId);
    if (!mod || !mod.modData) {
      toast.error('Данные мода не найдены');
      return;
    }

    toast.loading('Создаю ZIP архив...', { id: 'download' });

    try {
      const zip = new JSZip();
      const modName = mod.name.replace(/\s+/g, '').toLowerCase();
      
      if (mod.modData.mainClass) {
        zip.file(`src/main/java/com/example/${modName}/${mod.modData.modName || 'Main'}.java`, mod.modData.mainClass);
      }
      
      if (mod.modData.buildGradle) {
        zip.file('build.gradle', mod.modData.buildGradle);
      }
      
      if (mod.modData.files && Array.isArray(mod.modData.files)) {
        mod.modData.files.forEach((file: any) => {
          zip.file(file.path, file.content);
        });
      }

      const readmeContent = `# ${mod.name}\n\n${mod.description}\n\nLoader: ${mod.loader}\nMinecraft Version: ${mod.version}\n\n## Компиляция\n\n1. Установи JDK 17+\n2. Запусти: gradlew build (Windows) или ./gradlew build (Linux/Mac)\n3. Готовый .jar файл будет в build/libs/\n\n## Установка\n\n1. Скомпилируй мод\n2. Скопируй .jar файл в папку mods Minecraft\n3. Запусти игру с ${mod.loader}`;
      zip.file('README.md', readmeContent);
      
      zip.file('gradlew', `#!/bin/sh\n# Gradle wrapper script\njava -jar gradle/wrapper/gradle-wrapper.jar "$@"`);
      zip.file('gradlew.bat', `@echo off\nrem Gradle wrapper script\njava -jar gradle\\wrapper\\gradle-wrapper.jar %*`);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mod.name.replace(/\s+/g, '_')}_mod.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('ZIP архив скачан! Распакуй и запусти gradlew build', { id: 'download' });
    } catch (error) {
      toast.error('Ошибка создания архива', { id: 'download' });
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    if (!currentModId) {
      toast.error('Сначала создай мод');
      return;
    }

    const userMessage = chatMessage;
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }]);
    setChatMessage('');

    toast.loading('AI обновляет мод...', { id: 'updating' });

    try {
      const currentMod = mods.find(m => m.id === currentModId);
      
      const response = await fetch(API_URLS.chatMod, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modId: currentModId,
          message: userMessage,
          currentCode: currentMod?.modData || {}
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обновления');
      }

      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: data.aiMessage || 'Готово! Мод обновлён.' 
      }]);

      setMods(prevMods => prevMods.map(m => 
        m.id === currentModId 
          ? { ...m, modData: data.updatedCode }
          : m
      ));

      toast.success('Мод обновлён!', { id: 'updating' });
    } catch (error: any) {
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Ошибка: ${error.message}. Попробуй переформулировать запрос.` 
      }]);
      toast.error('Не удалось обновить мод', { id: 'updating' });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.jar')) {
      setSelectedJar(file);
      toast.success(`Файл ${file.name} выбран`);
    } else {
      toast.error('Выбери .jar файл мода');
    }
  };

  const handlePortMod = async () => {
    if (!selectedJar) {
      toast.error('Выбери JAR файл мода');
      return;
    }

    setIsPorting(true);
    toast.loading('Анализирую и портирую мод...', { id: 'porting' });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const response = await fetch(API_URLS.portMod, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jarBase64: base64,
            targetVersion: portVersion,
            loader: portLoader
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Ошибка портирования');
        }

        const portedMod: Mod = {
          id: data.portId,
          name: `${data.modData.modName || 'PortedMod'}_${portVersion}`,
          description: `Портирован на ${portVersion}. Изменения: ${data.modData.changes?.join(', ') || 'базовая конвертация'}`,
          loader: portLoader === 'forge' ? 'Forge' : 'Fabric',
          version: portVersion,
          date: new Date().toISOString().split('T')[0],
          status: 'ready',
          modData: data.modData
        };

        setMods([portedMod, ...mods]);
        toast.success('Мод портирован! Можешь скачать обновленную версию', { id: 'porting' });
        setSelectedJar(null);
      };

      reader.readAsArrayBuffer(selectedJar);
    } catch (error: any) {
      toast.error(error.message || 'Не удалось портировать мод', { id: 'porting' });
    } finally {
      setIsPorting(false);
    }
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
          <TabsList className="grid w-full grid-cols-4 mb-8 h-14 pixel-border bg-card">
            <TabsTrigger value="generator" className="text-base pixel-button data-[state=active]:bg-primary">
              <Icon name="Cpu" className="mr-2" size={20} />
              Генератор
            </TabsTrigger>
            <TabsTrigger value="port" className="text-base pixel-button data-[state=active]:bg-primary">
              <Icon name="RefreshCw" className="mr-2" size={20} />
              Перенос
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

          <TabsContent value="port" className="space-y-6">
            <Card className="pixel-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="RefreshCw" size={24} />
                  Портирование мода
                </CardTitle>
                <CardDescription>
                  Загрузи JAR мод и конвертируй его на любую версию Minecraft
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Icon name="Upload" size={16} />
                    JAR файл мода
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept=".jar"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="jar-upload"
                      />
                      <div className="pixel-border bg-card p-4 cursor-pointer hover:bg-muted/50 transition">
                        <div className="flex items-center gap-3">
                          <Icon name="FileArchive" size={24} className="text-primary" />
                          <div>
                            <p className="text-sm font-medium">
                              {selectedJar ? selectedJar.name : 'Выбери .jar файл'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedJar ? `${(selectedJar.size / 1024).toFixed(2)} KB` : 'Кликни чтобы выбрать'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Icon name="Box" size={16} />
                      Целевой загрузчик
                    </label>
                    <Select value={portLoader} onValueChange={setPortLoader}>
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
                      <Icon name="Target" size={16} />
                      Целевая версия
                    </label>
                    <Select value={portVersion} onValueChange={setPortVersion}>
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

                <Button
                  onClick={handlePortMod}
                  disabled={!selectedJar || isPorting}
                  size="lg"
                  className="w-full pixel-button pixel-border bg-secondary hover:bg-secondary/90 text-lg h-14"
                >
                  {isPorting ? (
                    <>
                      <Icon name="Loader2" className="mr-2 animate-spin" size={20} />
                      Портирую мод...
                    </>
                  ) : (
                    <>
                      <Icon name="Zap" className="mr-2" size={20} />
                      Портировать на {portVersion}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="pixel-border bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon name="Info" size={20} />
                  Как работает портирование
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Анализ всех Java классов мода</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Обновление API под новую версию</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Исправление breaking changes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Готовый Gradle проект</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="port" className="space-y-6">
            <Card className="pixel-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="RefreshCw" size={24} />
                  Портирование мода
                </CardTitle>
                <CardDescription>
                  Загрузи JAR мод и конвертируй его на любую версию Minecraft
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Icon name="Upload" size={16} />
                    JAR файл мода
                  </label>
                  <label htmlFor="jar-upload">
                    <input
                      type="file"
                      accept=".jar"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="jar-upload"
                    />
                    <div className="pixel-border bg-card p-4 cursor-pointer hover:bg-muted/50 transition">
                      <div className="flex items-center gap-3">
                        <Icon name="FileArchive" size={24} className="text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {selectedJar ? selectedJar.name : 'Выбери .jar файл'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedJar ? `${(selectedJar.size / 1024).toFixed(2)} KB` : 'Кликни чтобы выбрать'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Icon name="Box" size={16} />
                      Целевой загрузчик
                    </label>
                    <Select value={portLoader} onValueChange={setPortLoader}>
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
                      <Icon name="Target" size={16} />
                      Целевая версия
                    </label>
                    <Select value={portVersion} onValueChange={setPortVersion}>
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

                <Button
                  onClick={handlePortMod}
                  disabled={!selectedJar || isPorting}
                  size="lg"
                  className="w-full pixel-button pixel-border bg-secondary hover:bg-secondary/90 text-lg h-14"
                >
                  {isPorting ? (
                    <>
                      <Icon name="Loader2" className="mr-2 animate-spin" size={20} />
                      Портирую мод...
                    </>
                  ) : (
                    <>
                      <Icon name="Zap" className="mr-2" size={20} />
                      Портировать на {portVersion}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="pixel-border bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon name="Info" size={20} />
                  Как работает портирование
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Анализ всех Java классов мода</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Обновление API под новую версию</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Исправление breaking changes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-primary mt-1" />
                    <span>Готовый Gradle проект</span>
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