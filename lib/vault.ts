import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const METADATA_KEY = "minimal2fa.account-metadata";
const SECRET_PREFIX = "minimal2fa.secret.";

type AccountMetadata = Omit<VaultAccount, "secret">;

export type VaultAccount = {
  id: string;
  issuer: string;
  account: string;
  secret: string;
  createdAt: number;
};

async function setSecret(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getSecret(key: string) {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function removeSecret(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

async function saveMetadata(metadata: AccountMetadata[]) {
  await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
}

export async function loadAccounts(): Promise<VaultAccount[]> {
  const raw = await AsyncStorage.getItem(METADATA_KEY);
  if (!raw) return [];
  const metadata = JSON.parse(raw) as AccountMetadata[];
  const accounts = await Promise.all(
    metadata.map(async (item) => ({ ...item, secret: (await getSecret(`${SECRET_PREFIX}${item.id}`)) ?? "" })),
  );
  return accounts.filter((item) => item.secret.length > 0);
}

export async function addAccount(input: Pick<VaultAccount, "issuer" | "account" | "secret">) {
  const raw = await AsyncStorage.getItem(METADATA_KEY);
  const metadata = raw ? (JSON.parse(raw) as AccountMetadata[]) : [];
  const account: VaultAccount = {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  await setSecret(`${SECRET_PREFIX}${account.id}`, account.secret);
  await saveMetadata([...metadata, { id: account.id, issuer: account.issuer, account: account.account, createdAt: account.createdAt }]);
  return account;
}

export async function deleteAccount(id: string) {
  const raw = await AsyncStorage.getItem(METADATA_KEY);
  const metadata = raw ? (JSON.parse(raw) as AccountMetadata[]) : [];
  await saveMetadata(metadata.filter((item) => item.id !== id));
  await removeSecret(`${SECRET_PREFIX}${id}`);
}
