from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class AgentBase(BaseModel):
    # Frontend id alanı backend "kimlik" alanıyla eşleşecek
    id: str = Field(alias="kimlik")
    name: str = Field(alias="ad")
    agentKind: str = Field(default="chatbot", alias="agent_kind")
    persona: Optional[str] = None
    prompt: Optional[str] = None
    negativePrompt: Optional[str] = Field(None, alias="negative_prompt")
    
    provider: str = "openai"
    model: str = "gpt-4o"
    
    temp: float = Field(0.7, alias="temperature")
    maxTokens: int = Field(2048, alias="max_tokens")
    
    strictFactCheck: bool = Field(True, alias="strict_fact_check")
    chatHistoryLength: int = Field(10, alias="chat_history_length")
    canAskFollowUp: bool = Field(True, alias="can_ask_follow_up")
    errorMessage: Optional[str] = Field(None, alias="error_message")
    
    active: bool = Field(True, alias="aktif_mi")
    avatarEmoji: Optional[str] = Field(None, alias="avatar_emoji")
    widgetColor: Optional[str] = Field(None, alias="widget_color")
    
    allowedRags: Optional[List[str]] = Field(None, alias="allowed_rags")
    allowedWorkflows: Optional[List[str]] = Field(None, alias="allowed_workflows")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class AgentResponse(AgentBase):
    pass
