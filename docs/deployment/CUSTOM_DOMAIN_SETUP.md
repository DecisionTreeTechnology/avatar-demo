# 🌐 Custom Domain Setup: demo.fertiligent.ai

## Overview
Configure the custom domain `demo.fertiligent.ai` for the Avatar Demo Azure Static Web App.

---

## 📋 Prerequisites

1. **Azure Static Web App**: `happy-mushroom-0d946260f` (already deployed)
2. **Domain Control**: Access to DNS management for `fertiligent.ai`
3. **Azure Portal Access**: Permissions to configure Static Web Apps

---

## 🔧 Step-by-Step Configuration

### **1. Access Azure Static Web Apps**
```
1. Go to Azure Portal (portal.azure.com)
2. Navigate to Static Web Apps
3. Select: happy-mushroom-0d946260f
4. Go to "Custom domains" in the left menu
```

### **2. Add Custom Domain**
```
1. Click "+ Add" 
2. Domain type: "Custom domain on other DNS"
3. Domain name: demo.fertiligent.ai
4. Validation type: "TXT record" (recommended)
```

### **3. DNS Configuration Required**

#### **A. TXT Record for Validation**
```dns
Type: TXT
Name: asuid.demo.fertiligent.ai
Value: [Azure will provide this value]
TTL: 3600 (1 hour)
```

#### **B. CNAME Record for Traffic**
```dns
Type: CNAME  
Name: demo
Value: happy-mushroom-0d946260f.2.azurestaticapps.net
TTL: 3600 (1 hour)
```

### **4. SSL Certificate**
- Azure automatically provisions SSL certificate
- Certificate is managed by Azure (free)
- HTTPS will be enforced automatically

---

## 🔍 Verification Steps

### **1. DNS Propagation Check**
```bash
# Check CNAME resolution
nslookup demo.fertiligent.ai

# Check TXT record
nslookup -type=TXT asuid.demo.fertiligent.ai
```

### **2. Azure Validation**
```
1. Return to Azure Portal
2. Click "Validate" on the custom domain
3. Wait for validation to complete (may take 5-10 minutes)
4. Status should show "Validated"
```

### **3. Test Custom Domain**
```
1. Wait 10-30 minutes for full propagation
2. Visit: https://demo.fertiligent.ai
3. Verify SSL certificate shows valid
4. Test all functionality works as expected
```

---

## 📚 DNS Provider Instructions

### **Cloudflare (Recommended)**
```
1. Login to Cloudflare dashboard
2. Select fertiligent.ai domain
3. Go to DNS → Records
4. Add records as specified above
5. Ensure proxy status is "DNS only" (gray cloud)
```

### **Other DNS Providers**
- **GoDaddy**: DNS Management → Add Record
- **Namecheap**: Advanced DNS → Add New Record  
- **Route 53**: Hosted Zones → Create Record Set

---

## 🚨 Important Notes

### **SSL Certificate**
- Automatic provisioning by Azure
- Can take 24-48 hours for first-time setup
- Free managed certificate included

### **DNS Propagation**
- TXT record: Usually 5-10 minutes
- CNAME record: Can take up to 24 hours globally
- Use DNS checker tools to verify propagation

### **Domain Validation**
- Must complete TXT record validation first
- CNAME can be added simultaneously but won't work until validation completes
- Azure will show validation status in real-time

---

## 🔄 Update Workflow After Configuration

### **Update Documentation**
Once custom domain is active, update:

```markdown
- README.md: Change demo URL
- GitHub repo description
- Any hardcoded URLs in code
```

### **Environment Variables**
No changes needed to build process or environment variables.

### **GitHub Actions**
Current workflow will continue to work - it deploys to Azure Static Web App, which then serves content through custom domain.

---

## 🆘 Troubleshooting

### **Common Issues**

1. **Validation Fails**
   - Verify TXT record is correct
   - Check DNS propagation globally
   - Wait 24 hours maximum

2. **CNAME Not Resolving**  
   - Ensure no conflicting A records
   - Verify CNAME points to exact Azure domain
   - Check for DNS provider caching

3. **SSL Certificate Issues**
   - Wait 48 hours for auto-provisioning
   - Verify domain is fully validated first
   - Contact Azure support if needed

### **Verification Commands**
```bash
# Check all DNS records
dig demo.fertiligent.ai ANY

# Test HTTPS specifically  
curl -I https://demo.fertiligent.ai

# Check SSL certificate details
openssl s_client -connect demo.fertiligent.ai:443 -servername demo.fertiligent.ai
```

---

## ✅ Final Checklist

- [ ] TXT record added to DNS
- [ ] CNAME record added to DNS  
- [ ] Azure domain validation completed
- [ ] SSL certificate provisioned
- [ ] HTTPS redirect working
- [ ] Application loads correctly at demo.fertiligent.ai
- [ ] All functionality tested on custom domain
- [ ] Documentation updated with new URL

---

**Estimated Total Time**: 30 minutes setup + 24 hours propagation

*Custom domain configuration guide for Avatar Demo*
