"""
Test Runner for GMBot v2.0

Runs all test suites with proper path setup.
Usage: python run_tests.py [--verbose] [--edge] [--handlers] [--services] [--all]
"""
import sys
import os
import asyncio
import argparse
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


def run_edge_case_tests():
    """Run edge case tests."""
    print("=" * 60)
    print("EDGE CASE TESTS")
    print("=" * 60)
    print()
    
    from tests.test_edge_cases import (
        # Verification tests
        test_verify_user_not_in_channel,
        test_verify_user_banned_from_channel,
        test_verify_user_is_admin,
        test_verify_cache_hit_positive,
        test_verify_cache_hit_negative,
        # Protection tests
        test_mute_already_muted_user,
        test_unmute_not_muted_user,
        # Input validation
        test_channel_username_normalization,
        test_empty_channel_username,
        test_invalid_group_id,
        test_user_id_validation,
        # Concurrent operations
        test_concurrent_verification_calls,
        test_concurrent_mute_operations,
        # Cache tests
        test_cache_expired_entry,
        test_cache_special_characters_in_key,
        test_ttl_jitter_edge_cases,
        # Message handler tests
        test_message_from_bot,
        test_message_from_anonymous_admin,
        test_message_from_channel,
        test_empty_message,
        test_media_message,
    )
    
    print("== Verification Edge Cases ==")
    asyncio.run(test_verify_user_not_in_channel())
    asyncio.run(test_verify_user_banned_from_channel())
    asyncio.run(test_verify_user_is_admin())
    asyncio.run(test_verify_cache_hit_positive())
    asyncio.run(test_verify_cache_hit_negative())
    print()
    
    print("== Protection Edge Cases ==")
    asyncio.run(test_mute_already_muted_user())
    asyncio.run(test_unmute_not_muted_user())
    print()
    
    print("== Input Validation ==")
    test_channel_username_normalization()
    test_empty_channel_username()
    test_invalid_group_id()
    test_user_id_validation()
    print()
    
    print("== Concurrent Operations ==")
    asyncio.run(test_concurrent_verification_calls())
    asyncio.run(test_concurrent_mute_operations())
    print()
    
    print("== Cache Edge Cases ==")
    asyncio.run(test_cache_expired_entry())
    asyncio.run(test_cache_special_characters_in_key())
    test_ttl_jitter_edge_cases()
    print()
    
    print("== Message Handler Edge Cases ==")
    test_message_from_bot()
    test_message_from_anonymous_admin()
    test_message_from_channel()
    test_empty_message()
    test_media_message()
    print()
    
    print("[SUCCESS] Edge case tests passed!")


def run_handler_tests():
    """Run handler tests."""
    print("=" * 60)
    print("HANDLER TESTS")
    print("=" * 60)
    print()
    
    from tests.test_handlers import (
        test_start_command_private_chat,
        test_start_command_group_chat,
        test_help_command,
        test_protect_command_no_args,
        test_protect_command_in_private_chat,
        test_message_handler_from_bot,
        test_message_handler_anonymous_admin,
        test_join_handler_bot_joining,
    )
    
    print("== /start Command ==")
    asyncio.run(test_start_command_private_chat())
    asyncio.run(test_start_command_group_chat())
    print()
    
    print("== /help Command ==")
    asyncio.run(test_help_command())
    print()
    
    print("== /protect Command ==")
    asyncio.run(test_protect_command_no_args())
    asyncio.run(test_protect_command_in_private_chat())
    print()
    
    print("== Message Handler ==")
    asyncio.run(test_message_handler_from_bot())
    asyncio.run(test_message_handler_anonymous_admin())
    print()
    
    print("== Join Handler ==")
    asyncio.run(test_join_handler_bot_joining())
    print()
    
    print("[SUCCESS] Handler tests passed!")


def run_service_tests():
    """Run service tests (cache, verification, protection)."""
    print("=" * 60)
    print("SERVICE TESTS (Cache & Verification)")
    print("=" * 60)
    print()
    
    from tests.test_services import (
        test_cache_ttl_jitter,
        test_verification_service_cache_logic,
        test_protection_service_retry_logic,
        test_cache_graceful_degradation,
        test_protection_stats_tracking,
        test_verification_stats_tracking,
    )
    
    print("== Cache Tests ==")
    asyncio.run(test_cache_ttl_jitter())
    asyncio.run(test_cache_graceful_degradation())
    print()
    
    print("== Verification & Protection Tests ==")
    asyncio.run(test_verification_service_cache_logic())
    asyncio.run(test_protection_service_retry_logic())
    print()
    
    print("== Stats Tests ==")
    test_protection_stats_tracking()
    test_verification_stats_tracking()
    print()
    
    print("[SUCCESS] Service tests passed!")


def print_summary():
    """Print test summary."""
    print()
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print()
    print("Available test suites:")
    print("  --edge       Edge case tests (verification, protection, cache)")
    print("  --handlers   Handler tests (commands, events, callbacks)")
    print("  --services   Service tests (cache, verification, protection)")
    print("  --all        Run all tests")
    print()
    print("Examples:")
    print("  python run_tests.py --edge")
    print("  python run_tests.py --handlers")
    print("  python run_tests.py --all")
    print()


def main():
    parser = argparse.ArgumentParser(description="GMBot Test Runner")
    parser.add_argument("--edge", action="store_true", help="Run edge case tests")
    parser.add_argument("--handlers", action="store_true", help="Run handler tests")
    parser.add_argument("--services", action="store_true", help="Run service tests")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Default to showing summary
    if not any([args.edge, args.handlers, args.services, args.all]):
        print_summary()
        return
    
    passed = 0
    failed = 0
    
    try:
        if args.edge or args.all:
            run_edge_case_tests()
            passed += 1
            print()
        
        if args.handlers or args.all:
            run_handler_tests()
            passed += 1
            print()
        
        if args.services or args.all:
            run_service_tests()
            passed += 1
            print()
        
        print("=" * 60)
        print(f"[ALL TESTS PASSED] {passed} suite(s) completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        failed += 1
        print()
        print("=" * 60)
        print(f"[TEST FAILED] Error: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
