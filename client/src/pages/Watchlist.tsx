import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, Eye, EyeOff, Trash2, Bell, BellOff, Building2, 
  ExternalLink, TrendingUp, AlertTriangle, Search, Plus,
  FileText, Globe, Users, Calendar
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Watchlist() {
  const { user, loading: authLoading } = useAuth();
  const { data: watchlist, refetch: refetchWatchlist, isLoading } = trpc.watchlist.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const [searchTerm, setSearchTerm] = useState("");
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesText, setNotesText] = useState("");

  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      toast.success("Yritys poistettu seurannasta");
      refetchWatchlist();
    },
    onError: () => toast.error("Poisto epäonnistui"),
  });

  const updateNotesMutation = trpc.watchlist.updateNotes.useMutation({
    onSuccess: () => {
      toast.success("Muistiinpano tallennettu");
      setEditingNotes(null);
      refetchWatchlist();
    },
    onError: () => toast.error("Tallennus epäonnistui"),
  });

  const toggleAlertsMutation = trpc.watchlist.toggleAlerts.useMutation({
    onSuccess: () => {
      toast.success("Ilmoitusasetukset päivitetty");
      refetchWatchlist();
    },
    onError: () => toast.error("Päivitys epäonnistui"),
  });

  const handleRemove = (companyId: number) => {
    if (confirm("Haluatko varmasti poistaa yrityksen seurannasta?")) {
      removeMutation.mutate({ companyId });
    }
  };

  const handleSaveNotes = (companyId: number) => {
    updateNotesMutation.mutate({ companyId, notes: notesText });
  };

  const handleToggleAlerts = (companyId: number, currentEnabled: boolean) => {
    toggleAlertsMutation.mutate({ companyId, enabled: !currentEnabled });
  };

  const startEditingNotes = (companyId: number, currentNotes: string | null) => {
    setEditingNotes(companyId);
    setNotesText(currentNotes || "");
  };

  const filteredWatchlist = watchlist?.filter(item =>
    item.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">Kirjaudu sisään</h2>
          <p className="text-muted-foreground mb-4">
            Watchlist-toiminto vaatii kirjautumisen.
          </p>
          <Link href="/login">
            <Button>Kirjaudu</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Watchlist</h1>
            <p className="text-muted-foreground">
              Seuraa kiinnostavia yrityksiä ja saa ilmoituksia muutoksista
            </p>
          </div>
          <Link href="/company-scout">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Etsi yrityksiä
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Hae seurattavista yrityksistä..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        {watchlist && watchlist.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{watchlist.length}</div>
                <div className="text-sm text-muted-foreground">Seurattavia</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {watchlist.filter(w => w.alertsEnabled).length}
                </div>
                <div className="text-sm text-muted-foreground">Hälytykset päällä</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">
                  {watchlist.filter(w => (w.talentNeedScore || 0) >= 7).length}
                </div>
                <div className="text-sm text-muted-foreground">Korkea signaali</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-600">
                  {watchlist.reduce((sum, w) => sum + (w.recentEventsCount || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Tapahtumia (30pv)</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Watchlist */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !filteredWatchlist || filteredWatchlist.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Ei seurattavia yrityksiä</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Hakuehdoilla ei löytynyt yrityksiä"
                  : "Lisää yrityksiä watchlistille Signal Scout -sivulta"}
              </p>
              {!searchTerm && (
                <Link href="/company-scout">
                  <Button>
                    <Search className="w-4 h-4 mr-2" />
                    Etsi yrityksiä
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredWatchlist.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Company Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            {item.companyName}
                            {item.domain && (
                              <a 
                                href={`https://${item.domain}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.industry && (
                              <Badge variant="secondary">{item.industry}</Badge>
                            )}
                            {item.yTunnus && (
                              <Badge variant="outline">{item.yTunnus}</Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Talent Need Score */}
                        {item.talentNeedScore !== null && (
                          <div className={`text-center px-3 py-1 rounded-lg ${
                            item.talentNeedScore >= 7 
                              ? 'bg-green-100 text-green-800' 
                              : item.talentNeedScore >= 4 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            <div className="text-lg font-bold">{item.talentNeedScore.toFixed(1)}</div>
                            <div className="text-xs">Signaali</div>
                          </div>
                        )}
                      </div>

                      {/* Recent Events */}
                      {item.recentEventsCount > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {item.recentEventsCount} tapahtumaa viimeisen 30 päivän aikana
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="mt-4">
                        {editingNotes === item.companyId ? (
                          <div className="space-y-2">
                            <Textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              placeholder="Kirjoita muistiinpano..."
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveNotes(item.companyId)}
                                disabled={updateNotesMutation.isPending}
                              >
                                {updateNotesMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Tallenna"
                                )}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingNotes(null)}
                              >
                                Peruuta
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                            onClick={() => startEditingNotes(item.companyId, item.notes)}
                          >
                            {item.notes ? (
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{item.notes}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 italic">
                                + Lisää muistiinpano
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAlerts(item.companyId, item.alertsEnabled)}
                        className={item.alertsEnabled ? "text-primary" : "text-muted-foreground"}
                      >
                        {item.alertsEnabled ? (
                          <Bell className="w-4 h-4" />
                        ) : (
                          <BellOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(item.companyId)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
