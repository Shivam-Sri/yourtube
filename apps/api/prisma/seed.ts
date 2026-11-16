/* Idempotent seed: safe to run any number of times (upserts by slug; counters are never reset).
 * Every video below was verified via YouTube oEmbed (HTTP 200 = public + embeddable). */
import { AspectRatio, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Quality = "1080p" | "720p" | "480p" | "Auto";
type Seed = {
  slug: string;
  ytId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  ratio: AspectRatio;
  qualities: Quality[];
  views: number;
  likes: number;
};

const L = AspectRatio.RATIO_16_9;
const V = AspectRatio.RATIO_9_16;
const ALL: Quality[] = ["1080p", "720p", "480p", "Auto"];
const MID: Quality[] = ["1080p", "720p", "Auto"];

const videos: Seed[] = [
  {
    slug: "big-buck-bunny-60fps-4k", ytId: "aqz-KE-bpKQ", ratio: L, qualities: ALL, views: 48210, likes: 3120,
    title: "Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film",
    description: "A giant rabbit with a heart bigger than himself takes revenge on three bullying rodents. Open movie by the Blender Foundation.",
    category: "Entertainment", tags: ["animation", "blender", "short-film", "open-movie"],
  },
  {
    slug: "sintel-open-movie", ytId: "eRsGyueVLvQ", ratio: L, qualities: ALL, views: 39800, likes: 2750,
    title: "Sintel - Open Movie by Blender Foundation",
    description: "A lonely young woman, Sintel, helps and befriends a dragon, whom she calls Scales. Third open movie from the Blender Foundation.",
    category: "Entertainment", tags: ["animation", "blender", "fantasy", "open-movie"],
  },
  {
    slug: "tears-of-steel-vfx-open-movie", ytId: "R6MlUcmOul8", ratio: L, qualities: ALL, views: 25400, likes: 1630,
    title: "Tears of Steel - Blender VFX Open Movie",
    description: "A sci-fi short mixing live action with CGI, made to showcase Blender's visual effects pipeline.",
    category: "Tech", tags: ["vfx", "blender", "sci-fi", "open-movie"],
  },
  {
    slug: "agent-327-operation-barbershop", ytId: "mN0zPOpADL4", ratio: L, qualities: MID, views: 12950, likes: 880,
    title: "Agent 327: Operation Barbershop",
    description: "Agent 327 investigates a suspicious barbershop in this animated short from Blender Studio.",
    category: "Entertainment", tags: ["animation", "blender", "comedy"],
  },
  {
    slug: "youtube-embedded-web-player-customization", ytId: "M7lc1UVf-VE", ratio: L, qualities: MID, views: 8420, likes: 410,
    title: "YouTube Developers Live: Embedded Web Player Customization",
    description: "How to customise the embedded YouTube player with parameters and the IFrame API.",
    category: "Education", tags: ["youtube", "iframe", "web-development", "api"],
  },
  {
    slug: "me-at-the-zoo", ytId: "jNQXAC9IVRw", ratio: L, qualities: MID, views: 61500, likes: 4100,
    title: "Me at the zoo",
    description: "The first video ever uploaded to YouTube, April 23, 2005.",
    category: "Lifestyle", tags: ["history", "youtube", "first-video"],
  },
  {
    slug: "short-become-a-nasa-astronaut", ytId: "k5Z7sFwFF7Q", ratio: V, qualities: ALL, views: 33100, likes: 2890,
    title: "Become a NASA Astronaut!",
    description: "What does it take to join NASA's astronaut corps? A quick look in under a minute.",
    category: "Education", tags: ["nasa", "space", "astronaut", "shorts"],
  },
  {
    slug: "short-voyager-spacecraft-golden-record", ytId: "1KSRtRTtdfc", ratio: V, qualities: MID, views: 21700, likes: 1980,
    title: "What do the Voyager spacecraft carry?",
    description: "The Voyagers are the farthest objects humans have sent anywhere. National Geographic on what they carry.",
    category: "Education", tags: ["space", "voyager", "science", "shorts"],
  },
  {
    slug: "short-default-cube-the-interview", ytId: "YsKxkP_kGbE", ratio: V, qualities: MID, views: 17300, likes: 1420,
    title: "Default Cube: the Interview",
    description: "A short, funny interview with Blender's most famous resident.",
    category: "Tech", tags: ["blender", "comedy", "3d", "shorts"],
  },
  {
    slug: "short-google-search-stargazing-edition", ytId: "mdSB_Fizm0A", ratio: V, qualities: MID, views: 9900, likes: 760,
    title: "Google Search Task: Stargazing Edition",
    description: "A quick Google Search task for stargazers.",
    category: "Lifestyle", tags: ["google", "space", "search", "shorts"],
  },
];

const embedFor = (ytId: string, q: Quality): string => {
  // YouTube treats `vq` as a hint and may ignore it; the rows exist so the switcher has distinct sources.
  const vq = { "1080p": "hd1080", "720p": "hd720", "480p": "large", Auto: "" }[q];
  return `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1${vq ? `&vq=${vq}` : ""}`;
};

async function main() {
  const creator = await prisma.user.upsert({
    where: { handle: "yourtube-demo" },
    update: {},
    create: {
      username: "YourTube Demo",
      handle: "yourtube-demo",
      email: "demo@yourtube.example",
      description: "Curated public videos, embedded from their original platforms.",
    },
  });

  for (const v of videos) {
    const data = {
      title: v.title,
      description: v.description,
      thumbnailUrl: `https://i.ytimg.com/vi/${v.ytId}/hqdefault.jpg`,
      aspectRatio: v.ratio,
      category: v.category,
      tags: v.tags,
      creatorId: creator.id,
    };
    const sources = v.qualities.map((q) => ({ quality: q, embedUrl: embedFor(v.ytId, q) }));

    await prisma.video.upsert({
      where: { slug: v.slug },
      // On re-run: refresh content and replace stream sources, but keep counters as they are.
      update: { ...data, streamSources: { deleteMany: {}, create: sources } },
      create: { ...data, slug: v.slug, views: v.views, likes: v.likes, streamSources: { create: sources } },
    });
  }

  const [nVideos, nSources, nShorts] = await Promise.all([
    prisma.video.count(),
    prisma.streamSource.count(),
    prisma.video.count({ where: { aspectRatio: V } }),
  ]);
  console.log(`Seeded: ${nVideos} videos (${nShorts} vertical), ${nSources} stream sources.`);
  console.log("Open: http://localhost:3000/");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
