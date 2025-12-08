import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, TrendingDown, Building2, Zap, Clock, 
  ArrowRight, AlertTriangle, DollarSign, Users, Briefcase,
  RefreshCw, Eye
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { fi } from "date-fns/locale";

// Event type icons and colors
const EVENT_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  funding: { icon: DollarSign, color: "text-green-600", bgColor: "bg-green-100", label: "Rahoitus" },
  yt_layoff: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100", label: "YT-neuvottelut" },
  yt_restructure: { icon: Users, color: "text-orange-600", bgColor: "bg-orange-100", label: "Uudelleenjärjestely" },
  expansion: { icon: TrendingUp, color: "text-blue-600", bgColor: "bg-blue-100", label: "Laajentuminen" },
  new_unit: { icon: Building2, color: "text-purple-600", bgColor: "bg-purple-100", label: "Uusi yksikkö" },
  acquisition: { icon: Briefcase, color: "text-indigo-600", bgColor: "bg-indigo-100", label: "Yrityskauppa" },
  leadership_change: { icon: Users, color: "text-yellow-600", bgColor: "bg-yellow-100", label: "Johtomuutos" },
  strategy_change: { icon: Zap, color: "text-cyan-600", bgColor: "bg-cyan-100", label: "Strategiamuutos" },
  other: { icon: Zap, color: "text-gray-600", bgColor: "bg-gray-100", label: "Muu" },
};

export function SignalFeed() {
  const { data: signals, isLoading, refetch } = trpc.signalFeed.recent.useQuery({ limit: 10 });
  const { data: stats } = trpc.signalFeed.stats.useQuery();
  const { data: topCompanies } = trpc.signalFeed.topCompanies.useQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.eventsLast24Hours}</div>
              <div className="text-xs text-muted-foreground">Signaaleja (24h)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.eventsLast7Days}</div>
              <div className="text-xs text-muted-foreground">Viikolla</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.activeCompanies}</div>
              <div className="text-xs text-muted-foreground">Aktiivisia</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Companies */}
      {topCompanies && topCompanies.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Vahvimmat signaalit
              </CardTitle>
              <Link href="/watchlist">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  Watchlist
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topCompanies.map((company: any, index: number) => (
                <div 
                  key={company.id} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <div>
                      <div className="font-medium">{company.name}</div>
                      {company.industry && (
                        <div className="text-xs text-muted-foreground">{company.industry}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {company.eventCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {company.eventCount} signaalia
                      </Badge>
                    )}
                    <div className={`px-2 py-1 rounded-full text-sm font-bold ${
                      company.talentNeedScore >= 7 
                        ? 'bg-green-100 text-green-700' 
                        : company.talentNeedScore >= 4 
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}>
                      {company.talentNeedScore?.toFixed(1) || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Signals */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Viimeisimmät signaalit
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {signals && signals.length > 0 ? (
            <div className="space-y-3">
              {signals.map((signal: any) => {
                const config = EVENT_CONFIG[signal.eventType] || EVENT_CONFIG.other;
                const Icon = config.icon;
                
                return (
                  <div 
                    key={signal.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">{signal.companyName}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {signal.headline || signal.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {signal.createdAt && formatDistanceToNow(new Date(signal.createdAt), { 
                          addSuffix: true, 
                          locale: fi 
                        })}
                        {signal.talentNeedScore && (
                          <>
                            <span>•</span>
                            <span className={signal.talentNeedScore >= 7 ? 'text-green-600 font-medium' : ''}>
                              Score: {signal.talentNeedScore.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Ei vielä signaaleja</p>
              <p className="text-sm">Aja Company Scout löytääksesi signaaleja</p>
              <Link href="/companies">
                <Button variant="outline" className="mt-4">
                  <Building2 className="w-4 h-4 mr-2" />
                  Avaa Company Scout
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">🔮 Kysy Väinöltä</h3>
              <p className="text-blue-100 text-sm">
                Analysoi yrityksiä ja saa ennusteita rekrytoinnista
              </p>
            </div>
            <Link href="/agents">
              <Button variant="secondary">
                Avaa Väinö
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SignalFeed;
