# Chat Transcript Queries for Application Insights

## How to Access Application Insights Logs
1. Go to https://portal.azure.com
2. Search "fertility-avatar-analytics"
3. Click on your Application Insights resource
4. In the left menu, click **Logs**
5. Paste any of these queries and click **Run**

## Query 1: All Chat Messages (Full Transcripts)
```kusto
// Get all chat messages with full conversation context
customEvents
| where name == "ChatMessage"
| extend 
    conversationId = tostring(customDimensions.conversationId),
    sessionId = tostring(customDimensions.sessionId),
    role = tostring(customDimensions.role),
    messageLength = toint(customDimensions.messageLength),
    messageNumber = toint(customDimensions.messageNumber)
| order by conversationId, messageNumber asc
| project 
    timestamp,
    conversationId,
    sessionId,
    role,
    messageNumber,
    messageLength,
    customDimensions
```

## Query 2: Full Conversation by Conversation ID
```kusto
// Replace YOUR_CONVERSATION_ID_HERE with actual conversation ID
let conversationId = "conv_YOUR_CONVERSATION_ID_HERE";
union
    (customEvents | where name == "ChatMessage" and customDimensions.conversationId == conversationId),
    (traces | where customDimensions.conversationId == conversationId and message startswith "Chat:")
| extend 
    role = tostring(customDimensions.role),
    messageNumber = toint(customDimensions.messageNumber)
| order by timestamp asc
| project 
    timestamp,
    role,
    messageNumber,
    message,
    customDimensions
```

## Query 3: Recent Chat Messages with Content
```kusto
// Get recent chat messages with actual message content
traces
| where message startswith "Chat:"
| extend 
    conversationId = tostring(customDimensions.conversationId),
    role = tostring(customDimensions.role),
    sessionId = tostring(customDimensions.sessionId)
| where timestamp > ago(24h)
| order by conversationId, timestamp asc
| project 
    timestamp,
    conversationId,
    sessionId,
    role,
    message,
    customDimensions
```

## Query 4: Conversation Summary with Message Count
```kusto
// Get conversation summaries with message counts
customEvents
| where name == "ChatMessage"
| extend 
    conversationId = tostring(customDimensions.conversationId),
    role = tostring(customDimensions.role)
| summarize 
    StartTime = min(timestamp),
    EndTime = max(timestamp),
    TotalMessages = count(),
    UserMessages = countif(role == "user"),
    AssistantMessages = countif(role == "assistant"),
    Duration = max(timestamp) - min(timestamp),
    SessionId = any(tostring(customDimensions.sessionId))
    by conversationId
| order by StartTime desc
```

## Query 5: Real-Time Active Conversations
```kusto
// Monitor active conversations in real-time (last 30 minutes)
customEvents
| where name == "ChatMessage" and timestamp > ago(30m)
| extend 
    conversationId = tostring(customDimensions.conversationId),
    role = tostring(customDimensions.role)
| summarize 
    LastActivity = max(timestamp),
    MessageCount = count(),
    SessionId = any(tostring(customDimensions.sessionId))
    by conversationId
| where LastActivity > ago(5m)  // Still active in last 5 minutes
| order by LastActivity desc
```

## Query 6: User Engagement Analysis
```kusto
// Analyze user engagement patterns
customEvents
| where name == "ChatMessage"
| extend 
    conversationId = tostring(customDimensions.conversationId),
    role = tostring(customDimensions.role),
    messageLength = toint(customDimensions.messageLength)
| where timestamp > ago(24h)
| summarize 
    Conversations = dcount(conversationId),
    TotalMessages = count(),
    AvgMessageLength = avg(messageLength),
    UserMessages = countif(role == "user"),
    AssistantMessages = countif(role == "assistant")
    by bin(timestamp, 1h)
| order by timestamp desc
```

## Query 7: Search Chat Content
```kusto
// Search for specific keywords in chat messages
traces
| where message startswith "Chat:" 
| where message contains "YOUR_SEARCH_TERM_HERE"
| extend 
    conversationId = tostring(customDimensions.conversationId),
    role = tostring(customDimensions.role)
| order by timestamp desc
| project 
    timestamp,
    conversationId,
    role,
    message
```

## Tips for Using These Queries

1. **Time Ranges**: Adjust `ago(24h)` to `ago(1h)`, `ago(7d)`, etc. for different time periods
2. **Filtering**: Add `| where sessionId == "your_session_id"` to filter by specific sessions
3. **Real-Time**: Use `ago(5m)` for real-time monitoring during your LinkedIn/Twitter launch
4. **Export Data**: Click "Export" to download results as CSV or Excel
5. **Save Queries**: Click "Save" to bookmark frequently used queries

## For Your Social Media Launch

Use Query 5 (Real-Time Active Conversations) during your launch to monitor:
- How many people are chatting with your avatar
- Active conversation threads
- Real-time user engagement

Set this query to auto-refresh every 30 seconds for live monitoring!