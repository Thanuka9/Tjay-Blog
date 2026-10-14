import "server-only";

import * as blobStore from "@/lib/store-blob";
import * as neonStore from "@/lib/store-neon";

function backend() {
  return process.env.DATA_BACKEND === "neon" ? neonStore : blobStore;
}

export async function listPostMeta(...args: Parameters<typeof blobStore.listPostMeta>) {
  return backend().listPostMeta(...args);
}
export async function getPost(...args: Parameters<typeof blobStore.getPost>) {
  return backend().getPost(...args);
}
export async function getPostBySlug(...args: Parameters<typeof blobStore.getPostBySlug>) {
  return backend().getPostBySlug(...args);
}
export async function listPublishedPosts(...args: Parameters<typeof blobStore.listPublishedPosts>) {
  return backend().listPublishedPosts(...args);
}
export async function listPostsByTopic(...args: Parameters<typeof blobStore.listPostsByTopic>) {
  return backend().listPostsByTopic(...args);
}
export async function listIssueMeta(...args: Parameters<typeof blobStore.listIssueMeta>) {
  return backend().listIssueMeta(...args);
}
export async function listPublishedIssues(...args: Parameters<typeof blobStore.listPublishedIssues>) {
  return backend().listPublishedIssues(...args);
}
export async function getPublishedIssue(...args: Parameters<typeof blobStore.getPublishedIssue>) {
  return backend().getPublishedIssue(...args);
}
export async function saveIssue(...args: Parameters<typeof blobStore.saveIssue>) {
  return backend().saveIssue(...args);
}
export async function searchPosts(...args: Parameters<typeof blobStore.searchPosts>) {
  return backend().searchPosts(...args);
}
export async function savePost(...args: Parameters<typeof blobStore.savePost>) {
  return backend().savePost(...args);
}
export async function deletePost(...args: Parameters<typeof blobStore.deletePost>) {
  return backend().deletePost(...args);
}
export async function listSubscribers(...args: Parameters<typeof blobStore.listSubscribers>) {
  return backend().listSubscribers(...args);
}
export async function addSubscriber(...args: Parameters<typeof blobStore.addSubscriber>) {
  return backend().addSubscriber(...args);
}
export async function unsubscribeByToken(...args: Parameters<typeof blobStore.unsubscribeByToken>) {
  return backend().unsubscribeByToken(...args);
}
export async function getHomeSettings(...args: Parameters<typeof blobStore.getHomeSettings>) {
  return backend().getHomeSettings(...args);
}
export async function saveHomeSettings(...args: Parameters<typeof blobStore.saveHomeSettings>) {
  return backend().saveHomeSettings(...args);
}
export async function getHomeSlides(...args: Parameters<typeof blobStore.getHomeSlides>) {
  return backend().getHomeSlides(...args);
}
export async function listTopics(...args: Parameters<typeof blobStore.listTopics>) {
  return backend().listTopics(...args);
}
export async function getTopic(...args: Parameters<typeof blobStore.getTopic>) {
  return backend().getTopic(...args);
}
export async function saveTopic(...args: Parameters<typeof blobStore.saveTopic>) {
  return backend().saveTopic(...args);
}
export async function deleteTopic(...args: Parameters<typeof blobStore.deleteTopic>) {
  return backend().deleteTopic(...args);
}
export async function recordOutboundMail(...args: Parameters<typeof blobStore.recordOutboundMail>) {
  return backend().recordOutboundMail(...args);
}
export async function listOutboundMail(...args: Parameters<typeof blobStore.listOutboundMail>) {
  return backend().listOutboundMail(...args);
}
export async function getDashboardStats(...args: Parameters<typeof blobStore.getDashboardStats>) {
  return backend().getDashboardStats(...args);
}
