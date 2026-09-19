import { ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { PERIOD_SECONDS } from "@/lib/totp";

export default function SettingsScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View className="pb-6 pt-3">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-primary">MINIMAL 2FA</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">Setări</Text>
        </View>

        <View className="rounded-3xl border border-border bg-surface p-5">
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <MaterialIcons name="timer" size={22} color={colors.primary} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-foreground">Perioadă cod</Text>
              <Text className="mt-1 text-sm text-muted">Codurile se schimbă automat</Text>
            </View>
            <Text className="text-base font-bold text-primary">{PERIOD_SECONDS}s</Text>
          </View>
          <View className="my-5 h-px bg-border" />
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
              <MaterialIcons name="lock-outline" size={22} color={colors.success} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-foreground">Stocare locală</Text>
              <Text className="mt-1 text-sm text-muted">Secretele sunt protejate pe dispozitiv</Text>
            </View>
            <MaterialIcons name="verified-user" size={21} color={colors.success} />
          </View>
        </View>

        <Text className="mb-3 mt-8 text-lg font-bold text-foreground">Despre aplicație</Text>
        <View className="rounded-3xl border border-border bg-surface p-5">
          <View className="flex-row items-start">
            <MaterialIcons name="info-outline" size={21} color={colors.primary} />
            <Text className="ml-3 flex-1 text-sm leading-5 text-muted">
              Minimal 2FA generează coduri TOTP offline folosind standardul RFC 6238. Nu există server intermediar și nu este necesar un cont pentru folosirea aplicației.
            </Text>
          </View>
          <View className="my-5 h-px bg-border" />
          <View className="flex-row items-start">
            <MaterialIcons name="phone-android" size={21} color={colors.primary} />
            <Text className="ml-3 flex-1 text-sm leading-5 text-muted">
              Aplicația este pregătită pentru Android și iOS prin Expo, cu o interfață nativă și aceeași logică de securitate pe ambele platforme.
            </Text>
          </View>
        </View>

        <View className="mt-8 items-center pb-5">
          <Text className="text-xs font-medium text-muted">Minimal 2FA · versiunea 1.0.0</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { paddingBottom: 12 } });
