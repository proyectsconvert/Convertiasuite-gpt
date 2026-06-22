import logging
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

async def record_usage(user_id: str, model_name: str, tokens_in: int, tokens_out: int) -> None:
    """
    Record LLM usage metrics to the database.
    Resolves the model ID from the database by name (creates model if missing)
    and inserts the request count, tokens, and calculated cost.
    """
    try:
        supabase = SupabaseClient().db
        
        # 1. Look up the model in the database
        model_res = supabase.table("models").select("*").eq("model_name", model_name).execute()
        
        if not model_res.data:
            # Model doesn't exist, create it dynamically
            provider = "Ollama"
            input_cost = 0.000002
            output_cost = 0.000002
            
            # Simple provider heuristics
            lower_name = model_name.lower()
            if "deepseek" in lower_name:
                provider = "DeepSeek"
                input_cost = 0.000003
                output_cost = 0.000003
            elif "llama" in lower_name:
                provider = "Meta"
                input_cost = 0.000005
                output_cost = 0.000005
            elif "qwen" in lower_name:
                provider = "Alibaba"
            elif "gpt-4" in lower_name or "gpt-3.5" in lower_name:
                provider = "OpenAI"
                if "mini" in lower_name:
                    input_cost = 0.00000015
                    output_cost = 0.0000006
                else:
                    input_cost = 0.000005
                    output_cost = 0.000015
            
            insert_res = supabase.table("models").insert({
                "provider": provider,
                "model_name": model_name,
                "context_window": 8192,
                "input_cost": input_cost,
                "output_cost": output_cost,
                "active": True
            }).execute()
            
            if not insert_res.data:
                logger.error(f"Failed to dynamically create model entry for: {model_name}")
                return
                
            model_id = insert_res.data[0]["model_id"]
            input_cost_val = input_cost
            output_cost_val = output_cost
        else:
            model_id = model_res.data[0]["model_id"]
            input_cost_val = float(model_res.data[0].get("input_cost") or 0.0)
            output_cost_val = float(model_res.data[0].get("output_cost") or 0.0)
            
        # 2. Calculate the cost for this transaction
        total_cost = (tokens_in * input_cost_val) + (tokens_out * output_cost_val)
        
        # 3. Write record to usage_tracking
        supabase.table("usage_tracking").insert({
            "user_id": user_id,
            "model_id": model_id,
            "request_count": 1,
            "tokens_input": tokens_in,
            "tokens_output": tokens_out,
            "total_cost": total_cost
        }).execute()
        
        logger.info(
            f"Logged usage tracking record: user_id={user_id} model={model_name} "
            f"tokens_in={tokens_in} tokens_out={tokens_out} cost=${total_cost:.6f}"
        )
    except Exception as e:
        logger.error(f"Error in record_usage tracking service: {e}", exc_info=True)
