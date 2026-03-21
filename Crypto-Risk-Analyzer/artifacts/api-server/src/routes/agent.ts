/**
 * GET /api/agent/signed-url
 * Returns a short-lived signed conversation URL for ElevenLabs Conversational AI.
 * Keeps the Agent ID and API key off the client bundle.
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/agent/signed-url", async (req, res): Promise<void> => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    res.status(503).json({
      error:
        "Voice agent is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in your environment.",
    });
    return;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } }
    );

    if (!response.ok) {
      const body = await response.text();
      req.log.error({ status: response.status, body }, "ElevenLabs signed-url request failed");
      res.status(502).json({ error: "Failed to get signed URL from ElevenLabs." });
      return;
    }

    const data = (await response.json()) as { signed_url: string };
    res.json({ signed_url: data.signed_url });
  } catch (err) {
    req.log.error({ err }, "Error fetching ElevenLabs signed URL");
    res.status(500).json({ error: "Internal error generating voice session." });
  }
});

export default router;
