import { useState } from "react";
import { ChatInterface, Message } from "@/components/ChatInterface";
import { RecommendationPanel } from "@/components/RecommendationPanel";
import { MetricsComparison } from "@/components/MetricsComparison";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { leadsData } from "@/data/mockData";
import { BarChart3, MessageSquare, Sparkles } from "lucide-react";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [runType, setRunType] = useState<'baseline' | 'improved' | null>(null);
  const { toast } = useToast();

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Determinar si es baseline o improved basado en si ya hicimos un run
      const currentRunType = runType === null ? 'baseline' : 'improved';
      
      const { data, error } = await supabase.functions.invoke('copilot-recommend', {
        body: { 
          clientBrief: content,
          runType: currentRunType
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.recommendation,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setRecommendation(data.recommendation);
      setRunType(currentRunType);

      toast({
        title: "✅ Recomendación generada",
        description: `Análisis de 360° completado (${currentRunType === 'baseline' ? 'Run 1' : 'Run 2'})`,
      });

    } catch (error: any) {
      console.error('Error:', error);
      
      let errorMessage = 'Ocurrió un error al generar la recomendación';
      
      if (error.message?.includes('429')) {
        errorMessage = 'Límite de solicitudes excedido. Por favor espera un momento.';
      } else if (error.message?.includes('402')) {
        errorMessage = 'Créditos agotados. Por favor añade fondos a tu workspace.';
      }

      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive"
      });

      const errorMsg: Message = {
        role: 'assistant',
        content: `Lo siento, ${errorMessage}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunImproved = async () => {
    if (!messages.length) {
      toast({
        title: "⚠️ Advertencia",
        description: "Primero debes ejecutar el análisis baseline (Run 1)",
        variant: "destructive"
      });
      return;
    }

    // Usar el último mensaje del usuario para el run mejorado
    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
    if (lastUserMessage) {
      await handleSendMessage(lastUserMessage.content);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">KAVAK Retail Copilot</h1>
                <p className="text-xs text-muted-foreground">MVP - Tec Innovation Challenge 2025</p>
              </div>
            </div>
            <Button
              onClick={handleRunImproved}
              disabled={!recommendation || isLoading}
              variant="default"
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Ejecutar Run 2 (Mejorado)
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Chat Panel */}
          <div className="bg-card rounded-lg border border-border shadow-sm h-[600px]">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>

          {/* Recommendations Panel */}
          <div className="bg-card rounded-lg border border-border shadow-sm h-[600px]">
            <RecommendationPanel
              recommendation={recommendation}
              runType={runType}
            />
          </div>
        </div>

        {/* Metrics Section */}
        {runType === 'improved' && (
          <div className="animate-slide-in">
            <MetricsComparison />
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-secondary/30 rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-sm mb-2 text-foreground">📋 Perfilado</h3>
            <p className="text-xs text-muted-foreground">
              Análisis del cliente basado en restricciones y preferencias
            </p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-sm mb-2 text-foreground">🚗 Inventario</h3>
            <p className="text-xs text-muted-foreground">
              Recomendaciones con trade-offs claros de 3-5 vehículos
            </p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-sm mb-2 text-foreground">💰 Financiamiento</h3>
            <p className="text-xs text-muted-foreground">
              Esquemas viables con justificación transparente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
