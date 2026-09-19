import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { generateTOTP, normalizeBase32, PERIOD_SECONDS } from "@/lib/totp";
import {
  addAccount,
  deleteAccount,
  loadAccounts,
  type VaultAccount,
} from "@/lib/vault";

const EMPTY_FORM = { issuer: "", account: "", secret: "" };

export default function HomeScreen() {
  const colors = useColors();
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let isMounted = true;
    loadAccounts()
      .then((loaded) => {
        if (isMounted) setAccounts(loaded);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const secondsRemaining = PERIOD_SECONDS - (Math.floor(now / 1000) % PERIOD_SECONDS);
  const progress = secondsRemaining / PERIOD_SECONDS;
  const accountsWithCodes = useMemo(
    () => accounts.map((account) => ({ ...account, code: generateTOTP(account.secret, now) })),
    [accounts, now],
  );

  async function handleAddAccount() {
    const issuer = form.issuer.trim();
    const account = form.account.trim();
    const secret = normalizeBase32(form.secret);

    if (!issuer || !account || secret.length < 8) {
      Alert.alert("Date incomplete", "Completează serviciul, contul și secretul Base32.");
      return;
    }

    try {
      // Generate once so malformed Base32 secrets are rejected before saving.
      generateTOTP(secret, Date.now());
      setIsSaving(true);
      const created = await addAccount({ issuer, account, secret });
      setAccounts((current) => [...current, created]);
      setForm(EMPTY_FORM);
      setIsAddOpen(false);
    } catch {
      Alert.alert("Secret invalid", "Secretul trebuie să fie un cod Base32 valid furnizat de serviciu.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteAccount(id: string) {
    Alert.alert("Ștergi contul?", "Secretul și codurile acestui cont vor fi eliminate de pe dispozitiv.", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          await deleteAccount(id);
          setAccounts((current) => current.filter((item) => item.id !== id));
        },
      },
    ]);
  }

  async function handleCopy(id: string, code: string) {
    await Clipboard.setStringAsync(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1400);
  }

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right", "bottom"]}>
      <View className="flex-1">
        <View className="flex-row items-center justify-between pb-5 pt-3">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-primary">MINIMAL 2FA</Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">Codurile tale</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <MaterialIcons name="shield" size={23} color={colors.primary} />
          </View>
        </View>

        <View className="mb-5 rounded-3xl bg-primary p-5 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-medium text-white/75">PROTECȚIE ACTIVĂ</Text>
              <Text className="mt-2 text-2xl font-bold leading-8 text-white">Coduri locale, fără conturi.</Text>
              <Text className="mt-2 text-sm leading-5 text-white/75">Secretele rămân pe dispozitiv și nu părăsesc aplicația.</Text>
            </View>
            <View className="rounded-full bg-white/15 px-3 py-1.5">
              <Text className="text-xs font-semibold text-white">{accounts.length} {accounts.length === 1 ? "cont" : "conturi"}</Text>
            </View>
          </View>
          <View className="mt-5 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-emerald-300" />
            <Text className="text-xs font-medium text-white/75">Rotire la fiecare 120 secunde</Text>
          </View>
        </View>

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Conturi</Text>
          {accounts.length > 0 && (
            <Text className="text-xs font-medium text-muted">{secondsRemaining}s până la rotire</Text>
          )}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-muted">Se încarcă secretele…</Text>
          </View>
        ) : (
          <FlatList
            data={accountsWithCodes}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={accounts.length === 0 ? styles.emptyList : styles.list}
            renderItem={({ item }) => (
              <View className="mb-3 rounded-3xl border border-border bg-surface p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold text-foreground">{item.issuer}</Text>
                    <Text className="mt-1 text-sm text-muted" numberOfLines={1}>{item.account}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Șterge contul ${item.issuer}`}
                    onPress={() => handleDeleteAccount(item.id)}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <MaterialIcons name="delete-outline" size={19} color={colors.muted} />
                  </Pressable>
                </View>
                <View className="mt-5 flex-row items-center justify-between">
                  <Text className="text-[32px] font-bold tracking-[5px] text-foreground">{item.code}</Text>
                  <Pressable
                    onPress={() => handleCopy(item.id, item.code)}
                    style={({ pressed }) => [styles.copyButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
                  >
                    <MaterialIcons name={copiedId === item.id ? "check" : "content-copy"} size={16} color="#FFFFFF" />
                    <Text className="ml-1.5 text-xs font-bold text-white">{copiedId === item.id ? "Copiat" : "Copiază"}</Text>
                  </Pressable>
                </View>
                <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
                  <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View className="items-center rounded-3xl border border-dashed border-border bg-surface px-7 py-12">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <MaterialIcons name="key" size={25} color={colors.primary} />
                </View>
                <Text className="mt-5 text-center text-lg font-bold text-foreground">Adaugă primul cont</Text>
                <Text className="mt-2 text-center text-sm leading-5 text-muted">Folosește secretul Base32 oferit de serviciul pe care vrei să îl protejezi.</Text>
              </View>
            }
          />
        )}

        <Pressable
          onPress={() => setIsAddOpen(true)}
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
        >
          <MaterialIcons name="add" size={21} color="#FFFFFF" />
          <Text className="ml-2 text-base font-bold text-white">Adaugă cont</Text>
        </Pressable>
      </View>

      <Modal visible={isAddOpen} transparent animationType="slide" onRequestClose={() => setIsAddOpen(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.modalOverlay} onPress={() => setIsAddOpen(false)} />
          <View className="rounded-t-[32px] bg-background px-5 pb-8 pt-4">
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-foreground">Cont nou</Text>
                <Text className="mt-1 text-sm text-muted">Introdu datele din configurarea 2FA.</Text>
              </View>
              <Pressable onPress={() => setIsAddOpen(false)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Serviciu</Text>
            <TextInput
              value={form.issuer}
              onChangeText={(issuer) => setForm((current) => ({ ...current, issuer }))}
              placeholder="ex. GitHub"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Text className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted">Cont / email</Text>
            <TextInput
              value={form.account}
              onChangeText={(account) => setForm((current) => ({ ...current, account }))}
              placeholder="ex. tu@email.com"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
            <Text className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted">Secret Base32</Text>
            <TextInput
              value={form.secret}
              onChangeText={(secret) => setForm((current) => ({ ...current, secret }))}
              placeholder="ex. JBSWY3DPEHPK3PXP"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.secretInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleAddAccount}
            />
            <Text className="mt-2 text-xs leading-4 text-muted">Secretul este folosit doar pe dispozitiv pentru generarea codului.</Text>
            <Pressable
              disabled={isSaving}
              onPress={handleAddAccount}
              style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, isSaving && styles.disabled, pressed && styles.pressed]}
            >
              <Text className="text-base font-bold text-white">{isSaving ? "Se salvează…" : "Salvează contul"}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addButton: { alignItems: "center", borderRadius: 18, flexDirection: "row", justifyContent: "center", marginBottom: 8, marginTop: 12, minHeight: 56 },
  copyButton: { alignItems: "center", borderRadius: 12, flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9 },
  disabled: { opacity: 0.55 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 10 },
  iconButton: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  input: { borderRadius: 14, borderWidth: 1, fontSize: 16, minHeight: 52, paddingHorizontal: 15 },
  list: { paddingBottom: 4 },
  modalOverlay: { backgroundColor: "rgba(9, 10, 22, 0.45)", flex: 1 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  progressFill: { borderRadius: 99, height: "100%" },
  saveButton: { alignItems: "center", borderRadius: 16, justifyContent: "center", marginTop: 22, minHeight: 54 },
  secretInput: { letterSpacing: 1.4 },
});
