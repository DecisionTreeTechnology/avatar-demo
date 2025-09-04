import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Global teardown for bulletproof testing
 * 
 * Cleans up test environment and generates comprehensive test reports
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Bulletproof Testing Teardown Starting...');
  
  const startTime = Date.now();
  
  try {
    // 1. Generate test summary report
    console.log('📊 Generating test summary report...');
    
    const testStartTime = parseInt(process.env.TEST_START_TIME || '0');
    const totalTestTime = testStartTime ? Date.now() - testStartTime : 0;
    
    const summary = {
      timestamp: new Date().toISOString(),
      duration: totalTestTime,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        ci: !!process.env.CI,
        baseURL: config.use?.baseURL || 'unknown'
      },
      performance: {
        setupTime: parseInt(process.env.TEST_SETUP_TIME || '0'),
        baselineLoad: parseInt(process.env.PERF_BASELINE_LOAD || '0'),
        baselineMemory: parseInt(process.env.PERF_BASELINE_MEMORY || '0')
      },
      configuration: {
        workers: config.workers,
        retries: config.retries,
        timeout: config.timeout,
        projects: config.projects?.map(p => p.name) || []
      }
    };

    // Save summary report
    const summaryPath = path.join(process.cwd(), 'bulletproof-test-results', 'summary.json');
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`✅ Test summary saved to: ${summaryPath}`);

    // 2. Check for test artifacts and organize them
    console.log('📁 Organizing test artifacts...');
    
    const artifactDirs = [
      'bulletproof-test-results',
      'bulletproof-videos',
      'test-results'
    ];

    let totalArtifacts = 0;
    for (const dir of artifactDirs) {
      try {
        const dirPath = path.join(process.cwd(), dir);
        const files = await fs.readdir(dirPath, { recursive: true });
        totalArtifacts += Array.isArray(files) ? files.length : 0;
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    console.log(`📁 Total test artifacts: ${totalArtifacts} files`);

    // 3. Performance analysis
    if (summary.performance.baselineLoad > 0) {
      console.log('🚀 Performance Analysis:');
      
      if (summary.performance.baselineLoad > 5000) {
        console.warn(`⚠️  Slow load time detected: ${summary.performance.baselineLoad}ms`);
      } else {
        console.log(`✅ Good load time: ${summary.performance.baselineLoad}ms`);
      }
      
      const memoryMB = Math.round(summary.performance.baselineMemory / 1024 / 1024);
      if (memoryMB > 100) {
        console.warn(`⚠️  High memory usage detected: ${memoryMB}MB`);
      } else {
        console.log(`✅ Good memory usage: ${memoryMB}MB`);
      }
    }

    // 4. Generate recommendations based on test run
    console.log('💡 Generating recommendations...');
    
    const recommendations = [];
    
    if (summary.performance.baselineLoad > 3000) {
      recommendations.push('Consider optimizing application load time');
    }
    
    if (summary.performance.baselineMemory > 50 * 1024 * 1024) {
      recommendations.push('Monitor memory usage - consider optimization');
    }
    
    if (totalTestTime > 10 * 60 * 1000) { // 10 minutes
      recommendations.push('Test suite takes >10 minutes - consider parallel execution');
    }

    if (recommendations.length > 0) {
      console.log('💡 Recommendations:');
      recommendations.forEach(rec => console.log(`   • ${rec}`));
    } else {
      console.log('✅ No performance recommendations needed');
    }

    // 5. Cleanup temporary files if needed
    console.log('🧹 Performing cleanup...');
    
    // Clean up any temporary test files
    try {
      const tempDir = path.join(process.cwd(), 'temp-test-data');
      await fs.rmdir(tempDir, { recursive: true });
      console.log('✅ Temporary files cleaned up');
    } catch (error) {
      // No temp directory, that's fine
    }

    // 6. Final status report
    const teardownTime = Date.now() - startTime;
    const totalDurationMinutes = Math.round(totalTestTime / 1000 / 60);
    
    console.log('');
    console.log('🛡️  BULLETPROOF TESTING COMPLETE');
    console.log('═══════════════════════════════════');
    console.log(`⏱️  Total Duration: ${totalDurationMinutes} minutes`);
    console.log(`📊 Setup Time: ${summary.performance.setupTime}ms`);
    console.log(`🧹 Teardown Time: ${teardownTime}ms`);
    console.log(`📁 Artifacts: ${totalArtifacts} files`);
    console.log(`🌐 Environment: ${summary.environment.platform} (${summary.environment.nodeVersion})`);
    console.log('');
    
    if (process.env.CI) {
      console.log('🚀 CI Environment - Check artifacts in build output');
    } else {
      console.log('💻 Local Environment - Check bulletproof-test-results/ for detailed reports');
    }

    console.log('');
    console.log('✅ Bulletproof testing teardown completed successfully');

  } catch (error) {
    console.error('❌ Teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the build
  }
}

export default globalTeardown;